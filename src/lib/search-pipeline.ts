import { prisma } from "@/lib/prisma";
import {
  getRedditConfig,
  clearConfigCache,
  resetRateLimiter,
  searchReddit,
} from "@/lib/reddit";
import { computeRelevanceScore } from "@/lib/scoring";
import { findBestAccount } from "@/lib/matching";
import { aiScoreRelevance, warmAiConfig } from "@/lib/ai-scoring";

export interface SearchResult {
  message: string;
  summary: {
    clientsSearched: number;
    opportunitiesCreated: number;
    threadsDiscovered: number;
    skipped: { duplicate: number; tooOld: number; lowScore: number };
    mode: string;
    errors: number;
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

export async function runSearchPipeline(): Promise<SearchResult> {
  // Get settings
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  const maxResults = settings?.maxResultsPerKeyword ?? 10;
  const threadMaxAgeDays = settings?.threadMaxAgeDays ?? 2;
  const relevanceThreshold = settings?.relevanceThreshold ?? 0.4;
  const hasAiKey = !!(settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY);

  // Get Reddit config (handles both OAuth and public_json modes)
  clearConfigCache();
  const redditConfig = await getRedditConfig();

  // Reset rate limiter to clear stale state from previous runs
  resetRateLimiter(redditConfig.mode);

  // In OAuth mode, verify we have a token
  if (redditConfig.mode === "oauth" && !redditConfig.token) {
    throw new Error("Reddit OAuth credentials not configured. Set them in Settings or switch to Public JSON mode.");
  }

  // token is only used as a param for backwards-compat function signatures
  const token = redditConfig.token ?? "";

  // Get all active clients
  const clients = await prisma.client.findMany({
    where: { status: "active" },
  });

  if (clients.length === 0) {
    return {
      message: "No active clients found",
      summary: { clientsSearched: 0, opportunitiesCreated: 0, threadsDiscovered: 0, skipped: { duplicate: 0, tooOld: 0, lowScore: 0 }, mode: redditConfig.mode, errors: 0 },
    };
  }

  // Get all accounts with assignments for matching
  const accounts = await prisma.redditAccount.findMany({
    include: {
      accountAssignments: {
        select: { clientId: true },
      },
    },
  });

  let totalOpportunities = 0;
  const errors: string[] = [];
  let skippedDuplicate = 0;
  let skippedTooOld = 0;
  let skippedLowScore = 0;

  // ── Phase 1: Collect unique threads from deduplicated keyword searches ──
  // Deduplicate keywords across all clients to minimize Reddit API calls
  const uniqueKeywords = new Set<string>();
  for (const client of clients) {
    const keywords = client.keywords.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    for (const kw of keywords) uniqueKeywords.add(kw);
  }

  console.log(`[Search] Phase 1: Searching ${uniqueKeywords.size} unique keywords across ${clients.length} clients`);
  const discoveredThreads = new Map<string, DiscoveredThread>();

  let kwIdx = 0;
  for (const keyword of uniqueKeywords) {
    kwIdx++;
    try {
      const threads = await searchReddit(token, keyword, {
        sort: "new",
        time: "day",
        limit: maxResults,
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
      console.log(`[Search] Keyword ${kwIdx}/${uniqueKeywords.size} "${keyword}": ${threads.length} results (${discoveredThreads.size} total unique)`);
    } catch (err) {
      const msg = `Error searching "${keyword}": ${err instanceof Error ? err.message : "Unknown"}`;
      console.error(`[Search] Keyword ${kwIdx}/${uniqueKeywords.size} ${msg}`);
      errors.push(msg);
    }
  }

  console.log(`[Search] Phase 1 complete: ${discoveredThreads.size} unique threads from ${uniqueKeywords.size} keywords`);

  // ── Phase 2: Evaluate each thread against ALL active clients ──
  // NOTE: Phase 2 is entirely synchronous (no await) to avoid Prisma libsql
  // connection going stale after the long Phase 1 Reddit API calls.
  // Opportunities are collected in memory and batch-written after the loop.

  // Pre-compute client keywords for heuristic scoring
  const clientKeywordMap = new Map<string, string[]>();
  for (const client of clients) {
    clientKeywordMap.set(client.id, client.keywords.split(",").map((k) => k.trim()).filter(Boolean));
  }

  const heuristicPreFilter = Math.max(relevanceThreshold * 0.5, 0.1);
  let threadIdx = 0;

  // Batch-load existing opportunities BEFORE Phase 1 connection goes stale
  // (already loaded above in pre-Phase-1 section, so use existingSet from there)
  console.log(`[Search] Phase 2: Loading existing opportunities...`);
  const existingOpps = await prisma.opportunity.findMany({
    select: { threadId: true, clientId: true },
  });
  const existingSet = new Set(existingOpps.map((o) => `${o.threadId}::${o.clientId}`));
  console.log(`[Search] Phase 2: ${existingSet.size} existing opportunities loaded`);

  console.log(`[Search] Phase 2: Scoring ${discoveredThreads.size} threads × ${clients.length} clients (heuristic threshold: ${relevanceThreshold}, pre-filter: ${heuristicPreFilter.toFixed(2)})`);

  // Collect opportunities in memory (no DB writes in loop)
  interface PendingOpportunity {
    clientId: string;
    accountId: string | null;
    threadId: string;
    threadUrl: string;
    subreddit: string;
    title: string;
    bodySnippet: string | null;
    score: number;
    commentCount: number;
    threadAge: string;
    threadCreatedAt: Date;
    relevanceScore: number;
    discoveredVia: string;
  }
  const pendingOpps: PendingOpportunity[] = [];

  for (const [, thread] of discoveredThreads) {
    threadIdx++;

    // Progress log every 100 threads (BEFORE any skips)
    if (threadIdx % 100 === 0 || threadIdx === 1) {
      console.log(`[Search] Progress: ${threadIdx}/${discoveredThreads.size} threads, ${pendingOpps.length} pending, ${skippedTooOld} old, ${skippedLowScore} low, ${skippedDuplicate} dup`);
    }

    // Check thread age
    const threadDate = new Date(thread.createdUtc * 1000);
    const ageMs = Date.now() - threadDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > threadMaxAgeDays) { skippedTooOld++; continue; }

    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const threadAge =
      ageHours < 1
        ? "just now"
        : ageHours < 24
          ? `${ageHours}h ago`
          : `${Math.floor(ageDays)}d ago`;

    for (const client of clients) {
      // In-memory duplicate check
      if (existingSet.has(`${thread.threadId}::${client.id}`)) { skippedDuplicate++; continue; }

      const keywords = clientKeywordMap.get(client.id) || [];
      const heuristicScore = computeRelevanceScore({
        threadTitle: thread.title,
        threadBody: thread.selftext,
        clientKeywords: keywords,
        threadScore: thread.threadScore,
        commentCount: thread.numComments,
        threadCreatedAt: threadDate,
        threadMaxAgeDays,
      });

      if (heuristicScore < relevanceThreshold) {
        skippedLowScore++;
        continue;
      }

      // Match best account for this client
      const bestAccount = findBestAccount({
        subreddit: thread.subreddit,
        clientId: client.id,
        accounts,
      });

      pendingOpps.push({
        clientId: client.id,
        accountId: bestAccount?.id || null,
        threadId: thread.threadId,
        threadUrl: thread.threadUrl || `https://www.reddit.com${thread.permalink}`,
        subreddit: thread.subreddit,
        title: thread.title,
        bodySnippet: thread.selftext.slice(0, 500) || null,
        score: thread.threadScore,
        commentCount: thread.numComments,
        threadAge,
        threadCreatedAt: threadDate,
        relevanceScore: heuristicScore,
        discoveredVia: thread.discoveredVia,
      });

      // Also add to existingSet to prevent duplicates within this run
      existingSet.add(`${thread.threadId}::${client.id}`);
    }
  }

  console.log(`[Search] Phase 2 scoring done: ${pendingOpps.length} opportunities to create`);

  // ── Phase 3: Batch-write opportunities to DB ──
  // Create opportunities one at a time (Prisma doesn't support createMany with SQLite adapter well)
  let created = 0;
  for (const opp of pendingOpps) {
    try {
      await prisma.opportunity.create({
        data: {
          clientId: opp.clientId,
          accountId: opp.accountId,
          threadId: opp.threadId,
          threadUrl: opp.threadUrl,
          subreddit: opp.subreddit,
          title: opp.title,
          bodySnippet: opp.bodySnippet,
          topComments: null,
          score: opp.score,
          commentCount: opp.commentCount,
          threadAge: opp.threadAge,
          threadCreatedAt: opp.threadCreatedAt,
          relevanceScore: opp.relevanceScore,
          aiRelevanceNote: null,
          status: "new",
          discoveredVia: opp.discoveredVia,
        },
      });
      created++;
      if (created % 50 === 0) {
        console.log(`[Search] Phase 3: ${created}/${pendingOpps.length} opportunities written`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Skip duplicate constraint errors silently
      if (!msg.includes("Unique constraint")) {
        console.error(`[Search] Failed to create opportunity ${opp.threadId}/${opp.clientId}: ${msg}`);
      }
    }
  }

  totalOpportunities = created;
  console.log(`[Search] Complete: ${discoveredThreads.size} threads × ${clients.length} clients, ${created} created, ${skippedDuplicate} existing, ${skippedTooOld} too old, ${skippedLowScore} low score`);

  return {
    message: "Search complete",
    summary: {
      clientsSearched: clients.length,
      opportunitiesCreated: totalOpportunities,
      threadsDiscovered: discoveredThreads.size,
      skipped: { duplicate: skippedDuplicate, tooOld: skippedTooOld, lowScore: skippedLowScore },
      mode: redditConfig.mode,
      errors: errors.length,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}
