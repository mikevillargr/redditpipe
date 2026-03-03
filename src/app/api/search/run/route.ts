import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getRedditAccessToken,
  searchReddit,
  getThreadComments,
} from "@/lib/reddit";
import { computeRelevanceScore } from "@/lib/scoring";
import { findBestAccount } from "@/lib/matching";
import { generateReplyDraft } from "@/lib/ai";

export async function POST() {
  try {
    // Get settings
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const clientId =
      settings?.redditClientId || process.env.REDDIT_CLIENT_ID;
    const clientSecret =
      settings?.redditClientSecret || process.env.REDDIT_CLIENT_SECRET;
    const username =
      settings?.redditUsername || process.env.REDDIT_USERNAME;
    const password =
      settings?.redditPassword || process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
      return NextResponse.json(
        { error: "Reddit API credentials not configured. Set them in Settings." },
        { status: 400 }
      );
    }

    const maxResults = settings?.maxResultsPerKeyword ?? 10;
    const threadMaxAgeDays = settings?.threadMaxAgeDays ?? 2;

    // Get Reddit access token
    const token = await getRedditAccessToken(
      clientId,
      clientSecret,
      username,
      password
    );

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

    for (const client of clients) {
      const keywords = client.keywords.split(",").map((k) => k.trim()).filter(Boolean);

      for (const keyword of keywords) {
        try {
          // Search Reddit
          const threads = await searchReddit(token, keyword, {
            sort: "new",
            time: "day",
            limit: maxResults,
          });

          for (const thread of threads) {
            // Check for duplicates
            const existing = await prisma.opportunity.findUnique({
              where: { threadId: thread.id },
            });
            if (existing) continue;

            // Check thread age
            const threadDate = new Date(thread.created_utc * 1000);
            const ageMs = Date.now() - threadDate.getTime();
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            if (ageDays > threadMaxAgeDays) continue;

            // Fetch top comments
            let topComments = "";
            try {
              const comments = await getThreadComments(
                token,
                thread.id,
                thread.subreddit
              );
              topComments = comments
                .map((c) => `u/${c.author}: ${c.body.slice(0, 200)}`)
                .join("\n\n");
            } catch (err) {
              console.error(
                `Failed to fetch comments for ${thread.id}:`,
                err
              );
            }

            // Score
            const relevanceScore = computeRelevanceScore({
              threadTitle: thread.title,
              threadBody: thread.selftext,
              clientKeywords: keywords,
              threadScore: thread.score,
              commentCount: thread.num_comments,
              threadCreatedAt: threadDate,
              threadMaxAgeDays,
            });

            // Match account
            const bestAccount = findBestAccount({
              subreddit: thread.subreddit,
              clientId: client.id,
              accounts,
            });

            // Generate AI draft
            let aiDraftReply: string | null = null;
            try {
              const account = bestAccount
                ? await prisma.redditAccount.findUnique({
                    where: { id: bestAccount.id },
                  })
                : null;

              aiDraftReply = await generateReplyDraft({
                threadTitle: thread.title,
                threadBody: thread.selftext.slice(0, 1000),
                topComments,
                subreddit: thread.subreddit,
                clientName: client.name,
                clientUrl: client.websiteUrl,
                clientDescription: client.description,
                clientMentionTerms: client.mentionTerms || client.name,
                accountUsername: account?.username,
                accountPersonality: account?.personalitySummary || undefined,
                accountStyleNotes: account?.writingStyleNotes || undefined,
                accountSampleComments: account?.sampleComments || undefined,
              });
            } catch (err) {
              console.error(
                `Failed to generate AI draft for ${thread.id}:`,
                err
              );
            }

            // Calculate thread age string
            const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
            const threadAge =
              ageHours < 1
                ? "just now"
                : ageHours < 24
                  ? `${ageHours}h ago`
                  : `${Math.floor(ageDays)}d ago`;

            // Create opportunity
            await prisma.opportunity.create({
              data: {
                clientId: client.id,
                accountId: bestAccount?.id || null,
                threadId: thread.id,
                threadUrl: `https://www.reddit.com${thread.permalink}`,
                subreddit: thread.subreddit,
                title: thread.title,
                bodySnippet: thread.selftext.slice(0, 500) || null,
                topComments: topComments || null,
                score: thread.score,
                commentCount: thread.num_comments,
                threadAge,
                threadCreatedAt: threadDate,
                relevanceScore,
                aiDraftReply,
                status: "new",
              },
            });

            totalOpportunities++;
          }
        } catch (err) {
          const msg = `Error searching "${keyword}" for ${client.name}: ${err instanceof Error ? err.message : "Unknown"}`;
          console.error(msg);
          errors.push(msg);
        }
      }
    }

    return NextResponse.json({
      message: "Search complete",
      summary: {
        clientsSearched: clients.length,
        opportunitiesCreated: totalOpportunities,
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
