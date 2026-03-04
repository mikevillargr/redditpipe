import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRedditConfig,
  clearConfigCache,
  searchReddit,
  searchRedditComments,
  getThreadComments,
} from "@/lib/reddit";
import { computeRelevanceScore } from "@/lib/scoring";
import { findBestAccount } from "@/lib/matching";

import { aiScoreRelevance } from "@/lib/ai-scoring";

export async function POST() {
  try {
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

    // In OAuth mode, verify we have a token
    if (redditConfig.mode === "oauth" && !redditConfig.token) {
      return NextResponse.json(
        { error: "Reddit OAuth credentials not configured. Set them in Settings or switch to Public JSON mode." },
        { status: 400 }
      );
    }

    // token is only used as a param for backwards-compat function signatures
    const token = redditConfig.token ?? "";

    // Get all active clients
    const clients = await prisma.client.findMany({
      where: { status: "active" },
    });

    if (clients.length === 0) {
      return NextResponse.json({
        message: "No active clients found",
        summary: { clientsSearched: 0, opportunitiesCreated: 0 },
      });
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
    // Track thread IDs per client we've already processed this run to deduplicate
    const processedThreadClientPairs = new Set<string>();
    // Logging counters
    let totalThreadsSeen = 0;
    let skippedDuplicate = 0;
    let skippedTooOld = 0;
    let skippedLowScore = 0;
    let skippedAlreadyInRun = 0;

    // Helper: create an opportunity from a thread
    async function createOpportunity(
      threadId: string,
      threadUrl: string,
      subreddit: string,
      title: string,
      selftext: string,
      threadScore: number,
      numComments: number,
      createdUtc: number,
      permalink: string,
      clientObj: typeof clients[0],
      keywords: string[],
      discoveredVia: "thread_search" | "comment_search"
    ): Promise<boolean> {
      // Check for duplicates in DB
      const existing = await prisma.opportunity.findFirst({
        where: { threadId, clientId: clientObj.id },
      });
      if (existing) { skippedDuplicate++; return false; }

      // Check thread age
      const threadDate = new Date(createdUtc * 1000);
      const ageMs = Date.now() - threadDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays > threadMaxAgeDays) { skippedTooOld++; return false; }

      // Fetch top comments
      let topComments = "";
      try {
        const comments = await getThreadComments(token, threadId, subreddit, redditConfig);
        topComments = comments
          .map((c) => `u/${c.author}: ${c.body.slice(0, 200)}`)
          .join("\n\n");
      } catch (err) {
        console.error(`Failed to fetch comments for ${threadId}:`, err);
      }

      // Heuristic score
      const heuristicScore = computeRelevanceScore({
        threadTitle: title,
        threadBody: selftext,
        clientKeywords: keywords,
        threadScore,
        commentCount: numComments,
        threadCreatedAt: threadDate,
        threadMaxAgeDays,
      });

      // AI score (if API key is available)
      let relevanceScore = heuristicScore;
      let aiRelevanceNote: string | null = null;
      if (hasAiKey) {
        try {
          const aiResult = await aiScoreRelevance({
            threadTitle: title,
            threadBody: selftext,
            topComments,
            subreddit,
            clientName: clientObj.name,
            clientDescription: clientObj.description,
            clientKeywords: keywords,
            threshold: relevanceThreshold,
          });
          // Blend: 60% AI, 40% heuristic
          relevanceScore = Math.round((aiResult.score * 0.6 + heuristicScore * 0.4) * 100) / 100;
          aiRelevanceNote = aiResult.note;
          if (!aiResult.shouldKeep && relevanceScore < relevanceThreshold) {
            skippedLowScore++;
            return false;
          }
        } catch (err) {
          console.error(`AI scoring failed for ${threadId}, using heuristic:`, err);
        }
      } else if (heuristicScore < relevanceThreshold) {
        skippedLowScore++;
        return false;
      }

      // Match account
      const bestAccount = findBestAccount({
        subreddit,
        clientId: clientObj.id,
        accounts,
      });

      // Calculate thread age string
      const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
      const threadAge =
        ageHours < 1
          ? "just now"
          : ageHours < 24
            ? `${ageHours}h ago`
            : `${Math.floor(ageDays)}d ago`;

      await prisma.opportunity.create({
        data: {
          clientId: clientObj.id,
          accountId: bestAccount?.id || null,
          threadId,
          threadUrl: threadUrl || `https://www.reddit.com${permalink}`,
          subreddit,
          title,
          bodySnippet: selftext.slice(0, 500) || null,
          topComments: topComments || null,
          score: threadScore,
          commentCount: numComments,
          threadAge,
          threadCreatedAt: threadDate,
          relevanceScore,
          aiRelevanceNote,
          status: "new",
          discoveredVia,
        },
      });

      return true;
    }

    for (const client of clients) {
      const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

      for (const keyword of keywords) {
        // ── Thread search ──
        try {
          const threads = await searchReddit(token, keyword, {
            sort: "new",
            time: "day",
            limit: maxResults,
          }, redditConfig);

          for (const thread of threads) {
            totalThreadsSeen++;
            const pairKey = `${thread.id}:${client.id}`;
            if (processedThreadClientPairs.has(pairKey)) { skippedAlreadyInRun++; continue; }
            processedThreadClientPairs.add(pairKey);

            const created = await createOpportunity(
              thread.id,
              `https://www.reddit.com${thread.permalink}`,
              thread.subreddit,
              thread.title,
              thread.selftext,
              thread.score,
              thread.num_comments,
              thread.created_utc,
              thread.permalink,
              client,
              keywords,
              "thread_search"
            );
            if (created) totalOpportunities++;
          }
        } catch (err) {
          const msg = `Error searching threads "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }

        // ── Comment search ──
        try {
          const commentResults = await searchRedditComments(token, keyword, {
            sort: "new",
            time: "day",
            limit: maxResults,
          }, redditConfig);

          for (const comment of commentResults) {
            if (!comment.link_id) continue;
            totalThreadsSeen++;
            const parentThreadId = comment.link_id.replace(/^t3_/, "");
            const pairKey = `${parentThreadId}:${client.id}`;
            if (processedThreadClientPairs.has(pairKey)) { skippedAlreadyInRun++; continue; }
            processedThreadClientPairs.add(pairKey);

            const created = await createOpportunity(
              parentThreadId,
              comment.link_url,
              comment.subreddit,
              comment.link_title,
              comment.body.slice(0, 500),
              comment.score,
              0,
              comment.created_utc,
              comment.permalink,
              client,
              keywords,
              "comment_search"
            );
            if (created) totalOpportunities++;
          }
        } catch (err) {
          const msg = `Error searching comments "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    console.log(`[Search] Complete: ${totalThreadsSeen} threads seen, ${totalOpportunities} created, ${skippedDuplicate} existing, ${skippedTooOld} too old, ${skippedLowScore} low score, ${skippedAlreadyInRun} run-dedup`);

    return NextResponse.json({
      message: "Search complete",
      summary: {
        clientsSearched: clients.length,
        opportunitiesCreated: totalOpportunities,
        threadsSeen: totalThreadsSeen,
        skipped: { duplicate: skippedDuplicate, tooOld: skippedTooOld, lowScore: skippedLowScore, runDedup: skippedAlreadyInRun },
        mode: redditConfig.mode,
        errors: errors.length,
      },
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("POST /api/search/run error:", error);
    return NextResponse.json(
      {
        error: "Search pipeline failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
