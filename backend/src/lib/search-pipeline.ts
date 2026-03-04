import { createPrismaClient } from "./prisma.js";
import {
  getRedditConfig,
  clearConfigCache,
  resetRateLimiter,
  searchReddit,
  searchRedditComments,
  getThreadComments,
} from "./reddit.js";
import { computeRelevanceScore } from "./scoring.js";
import { findBestAccount } from "./matching.js";
import { aiScoreRelevance, warmAiConfig } from "./ai-scoring.js";

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
  discoveredVia: "thread_search" | "comment_search";
}

// ── Original inline AI scoring pipeline ──────────────────────────────────────
// Restored from the first working release (commit 56d94da).
// Key difference: AI scores every thread per client INLINE (not batched).
// This produces much better relevance because AI is the sole quality judge.

export async function runSearchPipeline(): Promise<SearchResult> {
  const startTime = Date.now();
  pipelineStatus = {
    running: true,
    phase: "init",
    progress: "Loading settings...",
    startedAt: new Date().toISOString(),
    lastCompletedAt: pipelineStatus.lastCompletedAt,
    lastResult: pipelineStatus.lastResult,
  };

  const db = createPrismaClient();

  try {
    // ── Load settings & config ──
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const maxResults = settings?.maxResultsPerKeyword ?? 10;
    const threadMaxAgeDays = settings?.threadMaxAgeDays ?? 2;
    const relevanceThreshold = settings?.relevanceThreshold ?? 0.4;
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
      const result: SearchResult = {
        message: "No active clients",
        summary: {
          clientsSearched: 0, opportunitiesCreated: 0, threadsDiscovered: 0,
          skipped: { duplicate: 0, tooOld: 0, lowScore: 0 },
          aiCalls: 0, mode: redditConfig.mode, errors: 0, durationMs: Date.now() - startTime,
        },
      };
      pipelineStatus = { running: false, phase: "idle", progress: "", startedAt: null, lastCompletedAt: new Date().toISOString(), lastResult: result };
      return result;
    }

    const accounts = await db.redditAccount.findMany({
      include: { accountAssignments: { select: { clientId: true } } },
    });

    if (hasAiKey) await warmAiConfig();

    let totalOpportunities = 0;
    const errors: string[] = [];
    let skippedDuplicate = 0;
    let skippedTooOld = 0;
    let skippedLowScore = 0;
    let aiCalls = 0;

    // ── Phase 1: Collect unique threads from all clients' keyword searches ──
    pipelineStatus.phase = "searching";
    const discoveredThreads = new Map<string, DiscoveredThread>();

    for (const client of clients) {
      const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

      for (const keyword of keywords) {
        pipelineStatus.progress = `Searching "${keyword}" for ${client.name}...`;

        // Thread search
        try {
          const threads = await searchReddit(token, keyword, {
            sort: "new", time: "day", limit: maxResults,
          }, redditConfig);

          for (const thread of threads) {
            if (!discoveredThreads.has(thread.id)) {
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
              });
            }
          }
        } catch (err) {
          const msg = `Error searching threads "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }

        // Comment search
        try {
          const commentResults = await searchRedditComments(token, keyword, {
            sort: "new", time: "day", limit: maxResults,
          }, redditConfig);

          for (const comment of commentResults) {
            if (!comment.link_id) continue;
            const parentThreadId = comment.link_id.replace(/^t3_/, "");
            if (!discoveredThreads.has(parentThreadId)) {
              discoveredThreads.set(parentThreadId, {
                threadId: parentThreadId,
                threadUrl: comment.link_url,
                subreddit: comment.subreddit,
                title: comment.link_title,
                selftext: comment.body.slice(0, 500),
                threadScore: comment.score,
                numComments: 0,
                createdUtc: comment.created_utc,
                permalink: comment.permalink,
                discoveredVia: "comment_search",
              });
            }
          }
        } catch (err) {
          const msg = `Error searching comments "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    console.log(`[Search] Phase 1: Discovered ${discoveredThreads.size} unique threads from keyword searches`);

    // ── Phase 2: Evaluate each thread against ALL active clients (inline AI scoring) ──
    pipelineStatus.phase = "scoring";
    const threadCommentsCache = new Map<string, string>();

    for (const [, thread] of discoveredThreads) {
      const threadDate = new Date(thread.createdUtc * 1000);
      const ageMs = Date.now() - threadDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > threadMaxAgeDays) { skippedTooOld++; continue; }

      // Fetch comments once per thread
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

      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const threadAge =
        ageHours < 1 ? "just now" : ageHours < 24 ? `${ageHours}h ago` : `${Math.floor(ageDays)}d ago`;

      // Score against each client
      for (const client of clients) {
        pipelineStatus.progress = `Scoring thread ${thread.threadId} for ${client.name}...`;

        // Check for existing opportunity in DB
        const existing = await db.opportunity.findFirst({
          where: { threadId: thread.threadId, clientId: client.id },
        });
        if (existing) { skippedDuplicate++; continue; }

        const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

        // Heuristic score as fallback
        const heuristicScore = computeRelevanceScore({
          threadTitle: thread.title,
          threadBody: thread.selftext,
          clientKeywords: keywords,
          threadScore: thread.threadScore,
          commentCount: thread.numComments,
          threadCreatedAt: threadDate,
          threadMaxAgeDays,
        });

        // AI score — use directly, no blending with heuristic
        let relevanceScore = heuristicScore;
        let aiRelevanceNote: string | null = null;
        if (hasAiKey) {
          try {
            aiCalls++;
            const aiResult = await aiScoreRelevance({
              threadTitle: thread.title,
              threadBody: thread.selftext,
              topComments,
              subreddit: thread.subreddit,
              clientName: client.name,
              clientDescription: client.description,
              clientKeywords: keywords,
              threshold: relevanceThreshold,
            });
            relevanceScore = aiResult.score;
            aiRelevanceNote = aiResult.note;
            if (!aiResult.shouldKeep) {
              skippedLowScore++;
              continue;
            }
          } catch (err) {
            console.error(`AI scoring failed for ${thread.threadId}/${client.name}, using heuristic:`, err);
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
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Search] Complete: ${discoveredThreads.size} threads × ${clients.length} clients, ${totalOpportunities} created, ${skippedDuplicate} existing, ${skippedTooOld} too old, ${skippedLowScore} low score, ${aiCalls} AI calls, ${(durationMs / 1000).toFixed(1)}s`);

    const result: SearchResult = {
      message: "Search complete",
      summary: {
        clientsSearched: clients.length,
        opportunitiesCreated: totalOpportunities,
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
