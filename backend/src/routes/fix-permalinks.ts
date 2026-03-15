// API endpoint to find and fix incorrect permalinks
import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
import { getRedditConfig } from "../lib/reddit.js";

const app = new Hono();

/**
 * POST /api/fix-permalinks/scan-thread/:opportunityId
 * Scans a thread to find the actual comment from our accounts and updates the permalink
 */
app.post("/scan-thread/:opportunityId", async (c) => {
  const opportunityId = c.req.param("opportunityId");
  const prisma = createPrismaClient();

  try {
    // Get the opportunity
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        account: {
          select: { username: true },
        },
      },
    });

    if (!opportunity) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    if (!opportunity.threadUrl) {
      return c.json({ error: "No thread URL found" }, 400);
    }

    // Get all account usernames
    const allAccounts = await prisma.redditAccount.findMany({
      select: { username: true },
    });
    const validAuthors = allAccounts.map((acc) => acc.username);

    console.log(`[FixPermalinks] Scanning thread: ${opportunity.threadUrl}`);
    console.log(`[FixPermalinks] Looking for comments from: ${validAuthors.join(", ")}`);

    // Fetch the thread
    const config = await getRedditConfig();
    const headers: Record<string, string> = {
      "User-Agent": "RedditPipe/2.0",
    };

    if (config.mode === "oauth" && config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const threadJsonUrl = opportunity.threadUrl.replace(/\/$/, "") + "/.json?limit=500&depth=10";
    const response = await fetch(threadJsonUrl, { headers });

    if (!response.ok) {
      return c.json({ error: `Reddit API returned ${response.status}` }, 500);
    }

    const data = await response.json();

    // Recursively find comments from our accounts
    const findComments = (children: any[]): any[] => {
      const results: any[] = [];
      for (const child of children || []) {
        if (child.kind === "t1") {
          const commentData = child.data;
          const author = commentData.author || "";
          const body = commentData.body || "";
          const commentId = commentData.id || "";
          const permalink = commentData.permalink || "";

          // Skip deleted/removed comments
          if (body === "[removed]" || body === "[deleted]" || author === "[deleted]") {
            continue;
          }

          // Check if this is from one of our accounts
          if (validAuthors.includes(author)) {
            results.push({
              author,
              id: commentId,
              permalink: `https://www.reddit.com${permalink}`,
              body: body.substring(0, 200),
              created_utc: commentData.created_utc,
            });
          }

          // Check replies
          if (commentData.replies?.data?.children) {
            results.push(...findComments(commentData.replies.data.children));
          }
        }
      }
      return results;
    };

    const comments = findComments(data[1]?.data?.children || []);

    console.log(`[FixPermalinks] Found ${comments.length} comments from our accounts`);

    if (comments.length === 0) {
      return c.json({
        success: false,
        message: "No comments found from our accounts on this thread",
        currentPermalink: opportunity.permalinkUrl,
      });
    }

    // Find the comment from the assigned account, or the most recent one
    let targetComment = comments.find((c) => c.author === opportunity.account?.username);
    if (!targetComment) {
      // Use the most recent comment from any of our accounts
      targetComment = comments.sort((a, b) => b.created_utc - a.created_utc)[0];
    }

    console.log(`[FixPermalinks] Selected comment from ${targetComment.author} (ID: ${targetComment.id})`);

    // Update the opportunity
    await prisma.opportunity.update({
      where: { id: opportunityId },
      data: {
        permalinkUrl: targetComment.permalink,
        status: "published",
        deletedAt: null,
        publishedAt: new Date(targetComment.created_utc * 1000),
      },
    });

    return c.json({
      success: true,
      message: "Permalink updated successfully",
      oldPermalink: opportunity.permalinkUrl,
      newPermalink: targetComment.permalink,
      author: targetComment.author,
      allCommentsFound: comments,
    });
  } catch (error) {
    console.error("[FixPermalinks] Error:", error);
    return c.json(
      { error: "Failed to scan thread", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

export default app;
