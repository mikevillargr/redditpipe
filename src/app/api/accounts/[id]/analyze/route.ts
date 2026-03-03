import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserProfile, getUserComments } from "@/lib/reddit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.redditAccount.findUnique({
      where: { id },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    // Fetch profile data
    const profile = await getUserProfile(account.username);

    // Fetch recent comments
    const comments = await getUserComments(account.username, 100);

    // Extract active subreddits
    const subredditCounts: Record<string, number> = {};
    comments.forEach((c) => {
      subredditCounts[c.subreddit] = (subredditCounts[c.subreddit] || 0) + 1;
    });
    const activeSubreddits = Object.entries(subredditCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([sub]) => sub);

    // Extract sample comments (top 6 by score)
    const sampleCommentTexts = comments
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(
        (c) =>
          `[r/${c.subreddit}, score: ${c.score}] ${c.body.slice(0, 300)}`
      );

    // Calculate account age in days
    const accountAgeDays = Math.floor(
      (Date.now() / 1000 - profile.created_utc) / 86400
    );

    // Update account — do NOT overwrite personalitySummary or writingStyleNotes
    const updated = await prisma.redditAccount.update({
      where: { id },
      data: {
        postKarma: profile.link_karma,
        commentKarma: profile.comment_karma,
        accountAgeDays,
        activeSubreddits: JSON.stringify(activeSubreddits),
        sampleComments: JSON.stringify(sampleCommentTexts),
      },
    });

    return NextResponse.json({
      success: true,
      account: updated,
      stats: {
        profileFetched: true,
        commentsAnalyzed: comments.length,
        activeSubreddits: activeSubreddits.length,
        sampleComments: sampleCommentTexts.length,
      },
    });
  } catch (error) {
    console.error("POST /api/accounts/[id]/analyze error:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze account",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
