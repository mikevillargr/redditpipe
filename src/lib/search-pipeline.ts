import { createPrismaClient } from "@/lib/prisma";
import {
  getRedditConfig,
  clearConfigCache,
  resetRateLimiter,
  searchReddit,
  getThreadComments,
} from "@/lib/reddit";
import { computeRelevanceScore } from "@/lib/scoring";
import { findBestAccount } from "@/lib/matching";
import { aiScoreRelevance, warmAiConfig } from "@/lib/ai-scoring";

// ── Pipeline config defaults ────────────────────────────────────────────────
const MAX_KEYWORDS_PER_CLIENT = 5;   // Only search top 5 most specific keywords
const MAX_RESULTS_PER_KEYWORD = 10;  // 10 results per keyword (not 25)
const MAX_AI_CALLS_PER_CLIENT = 10;  // AI score only top 10 candidates per client
const MAX_OPPS_PER_CLIENT = 15;      // Drip: max 15 new opportunities per client per run
const HEURISTIC_THRESHOLD = 0.35;    // Minimum heuristic score to be a candidate
const THREAD_MAX_AGE_DAYS = 2;       // Only threads from last 2 days

// ── Pipeline status (readable by API for frontend) ──────────────────────────
export interface PipelineStatus {
  running: boolean;
  phase: string;
  progress: string;
  startedAt: string | null;
  lastCompletedAt: string | null;
  lastResult: SearchResult | null;
}

let pipelineStatus: PipelineStatus = {
  running: false,
  phase: "idle",
  progress: "",
  startedAt: null,
  lastCompletedAt: null,
  lastResult: null,
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
    skipped: { duplicate: number; tooOld: number; lowScore: number };
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
  topComments?: string;
}

interface ScoredCandidate {
  clientId: string;
  clientName: string;
  accountId: string | null;
  thread: DiscoveredThread;
  heuristicScore: number;
  threadAge: string;
  threadCreatedAt: Date;
}

export async function runSearchPipeline(): Promise<SearchResult> {
  const startTime = Date.now();
  pipelineStatus = { running: true, phase: "init", progress: "Loading settings...", startedAt: new Date().toISOString(), lastCompletedAt: pipelineStatus.lastCompletedAt, lastResult: pipelineStatus.lastResult };

  // Fresh Prisma client per run — avoids stale libsql connections
  const db = createPrismaClient();

  try {
    // ── Load settings & config ──
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const maxResults = Math.min(settings?.maxResultsPerKeyword ?? MAX_RESULTS_PER_KEYWORD, MAX_RESULTS_PER_KEYWORD);
    const threadMaxAgeDays = settings?.threadMaxAgeDays ?? THREAD_MAX_AGE_DAYS;
    const hasAiKey = !!(settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY);

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
      const result: SearchResult = { message: "No active clients", summary: { clientsSearched: 0, opportunitiesCreated: 0, threadsDiscovered: 0, skipped: { duplicate: 0, tooOld: 0, lowScore: 0 }, aiCalls: 0, mode: redditConfig.mode, errors: 0, durationMs: Date.now() - startTime } };
      pipelineStatus = { running: false, phase: "idle", progress: "", startedAt: null, lastCompletedAt: new Date().toISOString(), lastResult: result };
      return result;
    }

    const accounts = await db.redditAccount.findMany({ include: { accountAssignments: { select: { clientId: true } } } });

    // Load existing opportunity keys for dedup
    const existingOpps = await db.opportunity.findMany({ select: { threadId: true, clientId: true } });
    const existingSet = new Set(existingOpps.map((o) => `${o.threadId}::${o.clientId}`));

    // Pre-warm AI config
    if (hasAiKey) await warmAiConfig();

    const errors: string[] = [];
    let skippedDuplicate = 0;
    let skippedTooOld = 0;
    let skippedLowScore = 0;
    let aiCalls = 0;

    // ── Phase 1: Search Reddit (limited keywords) ──────────────────────────
    // Pick top N most specific keywords per client (longer = more specific)
    const keywordToClients = new Map<string, string[]>();
    for (const client of clients) {
      const allKw = client.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
      // Sort by length desc (longer keywords are more specific), take top N
      const topKw = allKw.sort((a, b) => b.length - a.length).slice(0, MAX_KEYWORDS_PER_CLIENT);
      for (const kw of topKw) {
        const existing = keywordToClients.get(kw) || [];
        existing.push(client.id);
        keywordToClients.set(kw, existing);
      }
    }

    const uniqueKeywords = [...keywordToClients.keys()];
    pipelineStatus.phase = "searching";
    pipelineStatus.progress = `Searching ${uniqueKeywords.length} keywords...`;
    console.log(`[Search] Phase 1: ${uniqueKeywords.length} keywords across ${clients.length} clients`);

    const discoveredThreads = new Map<string, DiscoveredThread>();

    for (let i = 0; i < uniqueKeywords.length; i++) {
      const keyword = uniqueKeywords[i];
      pipelineStatus.progress = `Keyword ${i + 1}/${uniqueKeywords.length}: "${keyword}"`;
      try {
        const threads = await searchReddit(token, keyword, { sort: "new", time: "day", limit: maxResults }, redditConfig);
        for (const t of threads) {
          if (!discoveredThreads.has(t.id)) {
            discoveredThreads.set(t.id, {
              threadId: t.id,
              threadUrl: `https://www.reddit.com${t.permalink}`,
              subreddit: t.subreddit,
              title: t.title,
              selftext: t.selftext,
              threadScore: t.score,
              numComments: t.num_comments,
              createdUtc: t.created_utc,
              permalink: t.permalink,
            });
          }
        }
        console.log(`[Search] ${i + 1}/${uniqueKeywords.length} "${keyword}": ${threads.length} results (${discoveredThreads.size} unique)`);
      } catch (err) {
        const msg = `Error "${keyword}": ${err instanceof Error ? err.message : "Unknown"}`;
        console.error(`[Search] ${i + 1}/${uniqueKeywords.length} ${msg}`);
        errors.push(msg);
      }
    }

    console.log(`[Search] Phase 1 done: ${discoveredThreads.size} threads from ${uniqueKeywords.length} keywords`);

    // ── Phase 2: Score & rank (pure computation, no I/O) ───────────────────
    pipelineStatus.phase = "scoring";
    pipelineStatus.progress = `Scoring ${discoveredThreads.size} threads...`;

    // Pre-compute client keyword lists
    const clientKeywords = new Map<string, string[]>();
    for (const client of clients) {
      clientKeywords.set(client.id, client.keywords.split(",").map((k) => k.trim()).filter(Boolean));
    }

    // Score all thread-client pairs, collecting candidates per client
    const candidatesPerClient = new Map<string, ScoredCandidate[]>();
    for (const client of clients) {
      candidatesPerClient.set(client.id, []);
    }

    for (const [, thread] of discoveredThreads) {
      const threadDate = new Date(thread.createdUtc * 1000);
      const ageMs = Date.now() - threadDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > threadMaxAgeDays) { skippedTooOld++; continue; }

      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const threadAge = ageHours < 1 ? "just now" : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageDays)}d ago`;

      for (const client of clients) {
        if (existingSet.has(`${thread.threadId}::${client.id}`)) { skippedDuplicate++; continue; }

        const kws = clientKeywords.get(client.id) || [];
        const score = computeRelevanceScore({
          threadTitle: thread.title,
          threadBody: thread.selftext,
          clientKeywords: kws,
          threadScore: thread.threadScore,
          commentCount: thread.numComments,
          threadCreatedAt: threadDate,
          threadMaxAgeDays,
        });

        if (score < HEURISTIC_THRESHOLD) { skippedLowScore++; continue; }

        const bestAccount = findBestAccount({ subreddit: thread.subreddit, clientId: client.id, accounts });

        candidatesPerClient.get(client.id)!.push({
          clientId: client.id,
          clientName: client.name,
          accountId: bestAccount?.id || null,
          thread,
          heuristicScore: score,
          threadAge,
          threadCreatedAt: threadDate,
        });
      }
    }

    // Sort candidates per client by score desc, take top N for AI, drip limit for output
    const finalOpps: ScoredCandidate[] = [];
    for (const client of clients) {
      const candidates = candidatesPerClient.get(client.id) || [];
      candidates.sort((a, b) => b.heuristicScore - a.heuristicScore);
      // Take top candidates up to drip limit
      const topCandidates = candidates.slice(0, MAX_OPPS_PER_CLIENT);
      finalOpps.push(...topCandidates);
    }

    console.log(`[Search] Phase 2 done: ${finalOpps.length} candidates selected`);

    // ── Phase 3: Optional AI scoring on top candidates ─────────────────────
    interface FinalOpp {
      candidate: ScoredCandidate;
      relevanceScore: number;
      aiNote: string | null;
    }

    const aiScoredOpps: FinalOpp[] = [];

    if (hasAiKey && finalOpps.length > 0) {
      pipelineStatus.phase = "ai-scoring";

      // Group by client, AI score only top MAX_AI_CALLS_PER_CLIENT per client
      const byClient = new Map<string, ScoredCandidate[]>();
      for (const opp of finalOpps) {
        const list = byClient.get(opp.clientId) || [];
        list.push(opp);
        byClient.set(opp.clientId, list);
      }

      for (const [clientId, candidates] of byClient) {
        const client = clients.find((c) => c.id === clientId)!;
        const toScore = candidates.slice(0, MAX_AI_CALLS_PER_CLIENT);
        pipelineStatus.progress = `AI scoring ${toScore.length} for ${client.name}...`;

        for (const cand of toScore) {
          try {
            // Fetch top comments for context (rate-limited)
            let topCommentsText = "";
            try {
              const comments = await getThreadComments(token, cand.thread.threadId, cand.thread.subreddit, redditConfig);
              topCommentsText = comments.map((c) => `u/${c.author} (${c.score} pts): ${c.body}`).join("\n\n");
              cand.thread.topComments = topCommentsText;
            } catch { /* ignore — AI scoring works without comments */ }

            aiCalls++;
            const result = await aiScoreRelevance({
              threadTitle: cand.thread.title,
              threadBody: cand.thread.selftext,
              topComments: topCommentsText,
              subreddit: cand.thread.subreddit,
              clientName: client.name,
              clientDescription: client.description,
              clientKeywords: clientKeywords.get(clientId) || [],
              threshold: 0.5,
            });
            if (result.shouldKeep) {
              aiScoredOpps.push({ candidate: cand, relevanceScore: result.score, aiNote: result.note });
            } else {
              skippedLowScore++;
            }
          } catch (err) {
            console.error(`[Search] AI scoring failed for ${cand.thread.threadId}: ${err instanceof Error ? err.message : err}`);
            // Fall back to heuristic
            aiScoredOpps.push({ candidate: cand, relevanceScore: cand.heuristicScore, aiNote: null });
          }
        }

        // Add remaining (non-AI-scored) candidates if room in drip limit
        const aiScoredIds = new Set(toScore.map((c) => c.thread.threadId));
        const remaining = candidates.filter((c) => !aiScoredIds.has(c.thread.threadId));
        for (const cand of remaining.slice(0, MAX_OPPS_PER_CLIENT - toScore.length)) {
          aiScoredOpps.push({ candidate: cand, relevanceScore: cand.heuristicScore, aiNote: null });
        }
      }

      console.log(`[Search] Phase 3 done: ${aiCalls} AI calls, ${aiScoredOpps.length} passed`);
    } else {
      // No AI — just use heuristic scores
      for (const cand of finalOpps) {
        aiScoredOpps.push({ candidate: cand, relevanceScore: cand.heuristicScore, aiNote: null });
      }
    }

    // ── Phase 4: Write to DB ───────────────────────────────────────────────
    pipelineStatus.phase = "saving";
    pipelineStatus.progress = `Saving ${aiScoredOpps.length} opportunities...`;

    // Sort by score desc so highest quality are written first
    aiScoredOpps.sort((a, b) => b.relevanceScore - a.relevanceScore);

    let created = 0;
    for (const opp of aiScoredOpps) {
      const c = opp.candidate;
      try {
        await db.opportunity.create({
          data: {
            clientId: c.clientId,
            accountId: c.accountId,
            threadId: c.thread.threadId,
            threadUrl: c.thread.threadUrl,
            subreddit: c.thread.subreddit,
            title: c.thread.title,
            bodySnippet: c.thread.selftext || null,
            topComments: c.thread.topComments || null,
            score: c.thread.threadScore,
            commentCount: c.thread.numComments,
            threadAge: c.threadAge,
            threadCreatedAt: c.threadCreatedAt,
            relevanceScore: opp.relevanceScore,
            aiRelevanceNote: opp.aiNote,
            status: "new",
            discoveredVia: "thread_search",
          },
        });
        created++;
        existingSet.add(`${c.thread.threadId}::${c.clientId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (!msg.includes("Unique constraint") && !msg.includes("UNIQUE")) {
          console.error(`[Search] Write failed: ${msg}`);
        }
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Search] Done: ${created} created, ${skippedDuplicate} dup, ${skippedTooOld} old, ${skippedLowScore} low, ${aiCalls} AI calls, ${(durationMs / 1000).toFixed(1)}s`);

    const result: SearchResult = {
      message: "Search complete",
      summary: {
        clientsSearched: clients.length,
        opportunitiesCreated: created,
        threadsDiscovered: discoveredThreads.size,
        skipped: { duplicate: skippedDuplicate, tooOld: skippedTooOld, lowScore: skippedLowScore },
        aiCalls,
        mode: redditConfig.mode,
        errors: errors.length,
        durationMs,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    pipelineStatus = { running: false, phase: "idle", progress: "", startedAt: null, lastCompletedAt: new Date().toISOString(), lastResult: result };
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Search] Pipeline error: ${msg}`);
    pipelineStatus = { running: false, phase: "error", progress: msg, startedAt: null, lastCompletedAt: pipelineStatus.lastCompletedAt, lastResult: pipelineStatus.lastResult };
    throw err;
  } finally {
    await db.$disconnect().catch(() => {});
  }
}
