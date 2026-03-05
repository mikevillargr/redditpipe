import { createPrismaClient } from "./prisma.js";
import {
  getRedditConfig,
  clearConfigCache,
  resetRateLimiter,
  searchReddit,
  getThreadComments,
} from "./reddit.js";
import { computeRelevanceScore } from "./scoring.js";
import { findBestAccount } from "./matching.js";
import { aiScoreRelevance, warmAiConfig } from "./ai-scoring.js";

// ── Pipeline abort signal ────────────────────────────────────────────────────
let abortRequested = false;

export function abortSearch(): boolean {
  if (!pipelineStatus.running) return false;
  abortRequested = true;
  console.log("[Search] Abort requested — pipeline will stop at next checkpoint");
  return true;
}

// ── Pipeline status (readable by API for frontend) ──────────────────────────
export interface PipelineStatus {
  running: boolean;
  phase: string;
  progress: string;
  startedAt: string | null;
  lastCompletedAt: string | null;
  lastResult: SearchResult | null;
  opportunitiesCreated: number;
}

let pipelineStatus: PipelineStatus = {
  running: false,
  phase: "idle",
  progress: "",
  startedAt: null,
  lastCompletedAt: null,
  lastResult: null,
  opportunitiesCreated: 0,
};

export function getPipelineStatus(): PipelineStatus {
  return { ...pipelineStatus };
}

export interface SearchResult {
  message: string;
  summary: {
    clientsSearched: number;
    opportunitiesCreated: number;
    threadsDiscovered: number;
    skipped: { duplicate: number; tooOld: number; lowScore: number; heuristic: number };
    aiCalls: number;
    mode: string;
    errors: number;
    durationMs: number;
  };
  errors?: string[];
}

interface DiscoveredThread {
  threadId: string;
  threadUrl: string;
  subreddit: string;
  title: string;
  selftext: string;
  threadScore: number;
  numComments: number;
  createdUtc: number;
  permalink: string;
  discoveredVia: "thread_search" | "comment_search";
  clientIds: Set<string>; // which clients' keywords discovered this thread
}

// ── Safety caps ──────────────────────────────────────────────────────────────
export async function runSearchPipeline(): Promise<SearchResult> {
  const startTime = Date.now();
  abortRequested = false;
  pipelineStatus = {
    running: true,
    phase: "init",
    progress: "Loading settings...",
    startedAt: new Date().toISOString(),
    lastCompletedAt: pipelineStatus.lastCompletedAt,
    lastResult: pipelineStatus.lastResult,
    opportunitiesCreated: 0,
  };

  const db = createPrismaClient();

  try {
    // ── Load settings & config ──
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const maxResults = settings?.maxResultsPerKeyword ?? 10;
    const threadMaxAgeDays = settings?.threadMaxAgeDays ?? 2;
    const relevanceThreshold = settings?.relevanceThreshold ?? 0.4;
    const hasAiKey = !!(settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY);

    // ── Configurable pipeline limits ─────────────────────────────────────────────
    const MAX_AI_CANDIDATES_PER_CLIENT = settings?.maxAiCandidatesPerClient ?? 25;
    const MAX_AI_CALLS_TOTAL = settings?.maxAiCallsTotal ?? 200;
    const MAX_OPPS_PER_CLIENT = settings?.maxOppsPerClient ?? 20;
    const MAX_OPPS_TOTAL = settings?.maxOppsTotal ?? 50;
    const HEURISTIC_PRE_FILTER = 0.25; // threads below this skip AI entirely

    clearConfigCache();
    const redditConfig = await getRedditConfig();
    resetRateLimiter(redditConfig.mode);

    if (redditConfig.mode === "oauth" && !redditConfig.token) {
      throw new Error("Reddit OAuth credentials not configured.");
    }
    const token = redditConfig.token ?? "";

    // ── Load clients & accounts ──
    const clients = await db.client.findMany({ where: { status: "active" } });
    if (clients.length === 0) {
      const result: SearchResult = {
        message: "No active clients",
        summary: {
          clientsSearched: 0, opportunitiesCreated: 0, threadsDiscovered: 0,
          skipped: { duplicate: 0, tooOld: 0, lowScore: 0, heuristic: 0 },
          aiCalls: 0, mode: redditConfig.mode, errors: 0, durationMs: Date.now() - startTime,
        },
      };
      pipelineStatus = { running: false, phase: "idle", progress: "", startedAt: null, lastCompletedAt: new Date().toISOString(), lastResult: result, opportunitiesCreated: 0 };
      return result;
    }

    const accounts = await db.redditAccount.findMany({
      include: { accountAssignments: { select: { clientId: true } } },
    });

    if (hasAiKey) await warmAiConfig();

    let totalOpportunities = 0;
    const oppsPerClient = new Map<string, number>();
    const errors: string[] = [];
    let skippedDuplicate = 0;
    let skippedTooOld = 0;
    let skippedLowScore = 0;
    let skippedHeuristic = 0;
    let skippedCapped = 0;
    let aiCalls = 0;

    // Pre-load all existing opportunity keys for O(1) dedup
    const existingOpps = await db.opportunity.findMany({ select: { threadId: true, clientId: true } });
    const existingSet = new Set(existingOpps.map((o) => `${o.threadId}::${o.clientId}`));

    // ── Phase 1: Collect threads PER CLIENT (no keyword expansion) ──────────
    // Each thread tracks which client(s) discovered it via clientIds set.
    // No keyword expansion — use raw keywords only for precise results.
    pipelineStatus.phase = "searching";
    const discoveredThreads = new Map<string, DiscoveredThread>();

    for (const client of clients) {
      if (abortRequested) break;

      const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);
      console.log(`[Search] ${client.name}: ${keywords.length} keywords (no expansion)`);

      for (const keyword of keywords) {
        if (abortRequested) break;
        pipelineStatus.progress = `Searching "${keyword}" for ${client.name}...`;

        // Thread search
        try {
          const threads = await searchReddit(token, keyword, {
            sort: "new", time: "week", limit: maxResults,
          }, redditConfig);

          for (const thread of threads) {
            const existing = discoveredThreads.get(thread.id);
            if (existing) {
              existing.clientIds.add(client.id);
            } else {
              discoveredThreads.set(thread.id, {
                threadId: thread.id,
                threadUrl: `https://www.reddit.com${thread.permalink}`,
                subreddit: thread.subreddit,
                title: thread.title,
                selftext: thread.selftext,
                threadScore: thread.score,
                numComments: thread.num_comments,
                createdUtc: thread.created_utc,
                permalink: thread.permalink,
                discoveredVia: "thread_search",
                clientIds: new Set([client.id]),
              });
            }
          }
        } catch (err) {
          const msg = `Error searching threads "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }

        // Comment search disabled — thread search only for precision and efficiency
      }
    }

    console.log(`[Search] Phase 1: Discovered ${discoveredThreads.size} unique threads${abortRequested ? " (aborted)" : ""}`);

    // ── Phase 2A: Heuristic rank ALL thread×client pairs (free, instant) ────
    // Score everything cheaply, then only AI-score the top candidates.
    pipelineStatus.phase = "ranking";
    pipelineStatus.progress = "Heuristic ranking all candidates...";

    interface HeuristicCandidate {
      thread: DiscoveredThread;
      clientId: string;
      heuristicScore: number;
      threadDate: Date;
      threadAge: string;
    }

    const candidates: HeuristicCandidate[] = [];

    for (const [, thread] of discoveredThreads) {
      const threadDate = new Date(thread.createdUtc * 1000);
      const ageMs = Date.now() - threadDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > threadMaxAgeDays) { skippedTooOld++; continue; }

      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const threadAge =
        ageHours < 1 ? "just now" : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageDays)}d ago`;

      // Only score against clients whose keywords discovered this thread
      const relevantClients = clients.filter((c) => thread.clientIds.has(c.id));

      for (const client of relevantClients) {
        // Check for existing opportunity (O(1) set lookup)
        if (existingSet.has(`${thread.threadId}::${client.id}`)) {
          skippedDuplicate++;
          continue;
        }

        const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

        const heuristicScore = computeRelevanceScore({
          threadTitle: thread.title,
          threadBody: thread.selftext,
          clientKeywords: keywords,
          threadScore: thread.threadScore,
          commentCount: thread.numComments,
          threadCreatedAt: threadDate,
          threadMaxAgeDays,
        });

        if (heuristicScore < HEURISTIC_PRE_FILTER) {
          skippedHeuristic++;
          continue;
        }

        candidates.push({ thread, clientId: client.id, heuristicScore, threadDate, threadAge });
      }
    }

    // Sort by heuristic score descending — best candidates first
    candidates.sort((a, b) => b.heuristicScore - a.heuristicScore);

    // Select top N per client
    const aiCandidatesPerClient = new Map<string, number>();
    const topCandidates: HeuristicCandidate[] = [];
    let skippedRankedOut = 0;

    for (const candidate of candidates) {
      const clientAiCount = aiCandidatesPerClient.get(candidate.clientId) ?? 0;
      if (clientAiCount >= MAX_AI_CANDIDATES_PER_CLIENT) {
        skippedRankedOut++;
        continue;
      }
      aiCandidatesPerClient.set(candidate.clientId, clientAiCount + 1);
      topCandidates.push(candidate);
    }

    console.log(`[Search] Phase 2A: ${candidates.length} heuristic survivors → top ${topCandidates.length} candidates for AI scoring (${skippedRankedOut} ranked out)`);

    // ── Phase 2B: AI score only top candidates ──────────────────────────────
    pipelineStatus.phase = "scoring";
    const threadCommentsCache = new Map<string, string>();
    const clientMap = new Map(clients.map((c) => [c.id, c]));

    for (const candidate of topCandidates) {
      if (abortRequested) break;
      if (totalOpportunities >= MAX_OPPS_TOTAL) { console.log(`[Search] Total opp cap (${MAX_OPPS_TOTAL}) reached, stopping.`); break; }

      const client = clientMap.get(candidate.clientId)!;
      const { thread, heuristicScore, threadDate, threadAge } = candidate;

      // Per-client opp cap
      const clientOppCount = oppsPerClient.get(client.id) ?? 0;
      if (clientOppCount >= MAX_OPPS_PER_CLIENT) { skippedCapped++; continue; }

      const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

      // ── Fetch comments (only for AI candidates) ──
      let topComments = threadCommentsCache.get(thread.threadId) ?? "";
      if (!threadCommentsCache.has(thread.threadId)) {
        try {
          const comments = await getThreadComments(token, thread.threadId, thread.subreddit, redditConfig);
          topComments = comments
            .map((c) => `u/${c.author}: ${c.body.slice(0, 200)}`)
            .join("\n\n");
        } catch (err) {
          console.error(`Failed to fetch comments for ${thread.threadId}:`, err);
        }
        threadCommentsCache.set(thread.threadId, topComments);
      }

      // ── AI scoring (expensive, final filter) ──
      let relevanceScore = heuristicScore;
      let aiRelevanceNote: string | null = null;
      if (hasAiKey && aiCalls < MAX_AI_CALLS_TOTAL) {
        try {
          pipelineStatus.progress = `AI scoring ${thread.threadId} for ${client.name} (${aiCalls + 1}/${topCandidates.length} candidates)...`;
          aiCalls++;
          const aiResult = await aiScoreRelevance({
            threadTitle: thread.title,
            threadBody: thread.selftext,
            topComments,
            subreddit: thread.subreddit,
            clientName: client.name,
            clientDescription: client.description,
            clientKeywords: keywords,
            clientNuance: client.nuance,
            threshold: relevanceThreshold,
          });
          relevanceScore = aiResult.score;
          aiRelevanceNote = JSON.stringify({
            note: aiResult.note,
            factors: aiResult.factors || null,
          });
          if (!aiResult.shouldKeep) {
            skippedLowScore++;
            continue;
          }
        } catch (err) {
          console.error(`AI scoring failed for ${thread.threadId}/${client.name}, using heuristic:`, err);
        }
      } else if (aiCalls >= MAX_AI_CALLS_TOTAL) {
        if (heuristicScore < relevanceThreshold) {
          skippedLowScore++;
          continue;
        }
      } else if (heuristicScore < relevanceThreshold) {
        skippedLowScore++;
        continue;
      }

      // Match best account for this client
      const bestAccount = findBestAccount({
        subreddit: thread.subreddit,
        clientId: client.id,
        accounts,
      });

      await db.opportunity.create({
        data: {
          clientId: client.id,
          accountId: bestAccount?.id || null,
          threadId: thread.threadId,
          threadUrl: thread.threadUrl || `https://www.reddit.com${thread.permalink}`,
          subreddit: thread.subreddit,
          title: thread.title,
          bodySnippet: thread.selftext || null,
          topComments: topComments || null,
          score: thread.threadScore,
          commentCount: thread.numComments,
          threadAge,
          threadCreatedAt: threadDate,
          relevanceScore,
          aiRelevanceNote,
          status: "new",
          discoveredVia: thread.discoveredVia,
        },
      });

      totalOpportunities++;
      oppsPerClient.set(client.id, clientOppCount + 1);
      pipelineStatus.opportunitiesCreated = totalOpportunities;
    }

    const durationMs = Date.now() - startTime;
    const aborted = abortRequested;
    console.log(`[Search] ${aborted ? "Aborted" : "Complete"}: ${discoveredThreads.size} threads, ${candidates.length} heuristic survivors, ${topCandidates.length} AI candidates, ${totalOpportunities} created, ${skippedHeuristic} heuristic-filtered, ${skippedRankedOut} ranked-out, ${skippedDuplicate} existing, ${skippedTooOld} too old, ${skippedLowScore} AI-filtered, ${skippedCapped} capped, ${aiCalls} AI calls, ${(durationMs / 1000).toFixed(1)}s`);

    const result: SearchResult = {
      message: aborted ? "Search aborted" : "Search complete",
      summary: {
        clientsSearched: clients.length,
        opportunitiesCreated: totalOpportunities,
        threadsDiscovered: discoveredThreads.size,
        skipped: { duplicate: skippedDuplicate, tooOld: skippedTooOld, lowScore: skippedLowScore, heuristic: skippedHeuristic },
        aiCalls,
        mode: redditConfig.mode,
        errors: errors.length,
        durationMs,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    pipelineStatus = { running: false, phase: aborted ? "aborted" : "idle", progress: aborted ? "Stopped by user" : "", startedAt: null, lastCompletedAt: new Date().toISOString(), lastResult: result, opportunitiesCreated: totalOpportunities };
    abortRequested = false;
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Search] Pipeline error: ${msg}`);
    pipelineStatus = { running: false, phase: "error", progress: msg, startedAt: null, lastCompletedAt: pipelineStatus.lastCompletedAt, lastResult: pipelineStatus.lastResult, opportunitiesCreated: pipelineStatus.opportunitiesCreated };
    abortRequested = false;
    throw err;
  } finally {
    await db.$disconnect().catch(() => {});
  }
}
