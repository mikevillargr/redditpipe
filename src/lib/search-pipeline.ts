import { prisma } from "@/lib/prisma";
import {
  getRedditConfig,
  clearConfigCache,
  resetRateLimiter,
  searchReddit,
} from "@/lib/reddit";
import { computeRelevanceScore } from "@/lib/scoring";
import { findBestAccount } from "@/lib/matching";
import { aiScoreRelevance } from "@/lib/ai-scoring";

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
      // Wrap each keyword search in a 30s timeout to prevent hangs
      const threads = await Promise.race([
        searchReddit(token, keyword, {
          sort: "new",
          time: "day",
          limit: maxResults,
        }, redditConfig),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Keyword search timed out after 30s")), 30_000)
        ),
      ]);

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
  // Pre-compute client keywords for heuristic scoring
  const clientKeywordMap = new Map<string, string[]>();
  for (const client of clients) {
    clientKeywordMap.set(client.id, client.keywords.split(",").map((k) => k.trim()).filter(Boolean));
  }

  // Heuristic pre-filter threshold: threads must score at least this to proceed to AI
  const heuristicPreFilter = Math.max(relevanceThreshold * 0.5, 0.1);
  let aiScoringCalls = 0;
  let threadIdx = 0;

  for (const [, thread] of discoveredThreads) {
    threadIdx++;
    // Check thread age once
    const threadDate = new Date(thread.createdUtc * 1000);
    const ageMs = Date.now() - threadDate.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays > threadMaxAgeDays) { skippedTooOld++; continue; }

    // Calculate thread age string
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const threadAge =
      ageHours < 1
        ? "just now"
        : ageHours < 24
          ? `${ageHours}h ago`
          : `${Math.floor(ageDays)}d ago`;

    // Pre-filter: check if any client has a minimum heuristic match
    // This avoids fetching comments and AI scoring for completely irrelevant threads
    const candidateClients: Array<{ client: typeof clients[0]; keywords: string[]; heuristicScore: number }> = [];

    for (const client of clients) {
      // Check for existing opportunity in DB
      const existing = await prisma.opportunity.findFirst({
        where: { threadId: thread.threadId, clientId: client.id },
      });
      if (existing) { skippedDuplicate++; continue; }

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

      if (heuristicScore >= heuristicPreFilter) {
        candidateClients.push({ client, keywords, heuristicScore });
      } else {
        skippedLowScore++;
      }
    }

    if (candidateClients.length === 0) continue;

    // Score each candidate client (no comment fetching — avoids Reddit rate limit exhaustion)
    for (const { client, keywords, heuristicScore } of candidateClients) {
      let relevanceScore = heuristicScore;
      let aiRelevanceNote: string | null = null;

      if (hasAiKey) {
        try {
          aiScoringCalls++;
          const aiResult = await aiScoreRelevance({
            threadTitle: thread.title,
            threadBody: thread.selftext,
            topComments: "",
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

      await prisma.opportunity.create({
        data: {
          clientId: client.id,
          accountId: bestAccount?.id || null,
          threadId: thread.threadId,
          threadUrl: thread.threadUrl || `https://www.reddit.com${thread.permalink}`,
          subreddit: thread.subreddit,
          title: thread.title,
          bodySnippet: thread.selftext.slice(0, 500) || null,
          topComments: null,
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

    // Progress log every 100 threads
    if (threadIdx % 100 === 0) {
      console.log(`[Search] Progress: ${threadIdx}/${discoveredThreads.size} threads, ${totalOpportunities} opportunities, ${aiScoringCalls} AI calls`);
    }
  }

  console.log(`[Search] Complete: ${discoveredThreads.size} threads × ${clients.length} clients, ${totalOpportunities} created, ${skippedDuplicate} existing, ${skippedTooOld} too old, ${skippedLowScore} low score`);

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
