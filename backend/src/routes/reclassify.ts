// API endpoint to reclassify false positive deletions
import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
import { getRedditConfig } from "../lib/reddit.js";

const app = new Hono();

/**
 * POST /api/reclassify/deletions
 * Reclassify all opportunities marked as deleted_by_mod
 * Checks if comments actually exist and reclassifies to published if they do
 */
app.post("/deletions", async (c) => {
  const prisma = createPrismaClient();

  try {
    console.log("[Reclassify] Starting reclassification...");

    // Get all account usernames to check if ANY of our accounts has a comment
    const allAccounts = await prisma.redditAccount.findMany({
      select: { username: true },
    });
    const validAuthors = allAccounts.map(acc => acc.username);
    console.log(`[Reclassify] Checking against ${validAuthors.length} accounts: ${validAuthors.join(', ')}`);

    // Get all opportunities marked as deleted_by_mod
    const deletedOpportunities = await prisma.opportunity.findMany({
      where: {
        status: "deleted_by_mod",
      },
      include: {
        account: {
          select: {
            username: true,
          },
        },
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    console.log(`[Reclassify] Found ${deletedOpportunities.length} opportunities marked as deleted`);

    let checked = 0;
    let reclassified = 0;
    let actuallyDeleted = 0;
    let errors = 0;
    const results: any[] = [];

    for (const opp of deletedOpportunities) {
      checked++;

      if (!opp.permalinkUrl || !opp.account?.username) {
        results.push({
          id: opp.id,
          title: opp.title,
          status: "skipped",
          reason: "missing permalink or account",
        });
        continue;
      }

      console.log(`[${checked}/${deletedOpportunities.length}] Checking: ${opp.title.substring(0, 50)}...`);

      try {
        // Check the entire thread for comments from any of our accounts
        if (!opp.threadUrl) {
          results.push({
            id: opp.id,
            title: opp.title,
            status: "skipped",
            reason: "no thread URL",
          });
          continue;
        }

        const threadJsonUrl = opp.threadUrl.replace(/\/$/, "") + "/.json?limit=500&depth=10";
        const config = await getRedditConfig();
        const headers: Record<string, string> = {
          "User-Agent": "RedditPipe/2.0",
        };

        if (config.mode === "oauth" && config.token) {
          headers["Authorization"] = `Bearer ${config.token}`;
        }

        const response = await fetch(threadJsonUrl, { headers });
        if (!response.ok) {
          errors++;
          results.push({
            id: opp.id,
            title: opp.title,
            status: "error",
            error: `Reddit API returned ${response.status}`,
          });
          continue;
        }

        const data = await response.json();

        // Recursively search for comments from our accounts
        const findOurComments = (children: any[]): boolean => {
          for (const child of children || []) {
            if (child.kind === "t1") {
              const commentData = child.data;
              const author = commentData.author || "";
              const body = commentData.body || "";

              if (body === "[removed]" || body === "[deleted]" || author === "[deleted]") {
                continue;
              }

              if (validAuthors.includes(author)) {
                return true;
              }

              if (commentData.replies?.data?.children) {
                if (findOurComments(commentData.replies.data.children)) {
                  return true;
                }
              }
            }
          }
          return false;
        };

        const exists = findOurComments(data[1]?.data?.children || []);

        if (exists) {
          // Comment still exists from one of our accounts on the thread - this was a false positive!
          console.log(`  ✓ COMMENT EXISTS (from one of our accounts on thread) - Reclassifying to published`);

          await prisma.opportunity.update({
            where: { id: opp.id },
            data: {
              status: "published",
              deletedAt: null,
            },
          });

          reclassified++;
          results.push({
            id: opp.id,
            title: opp.title,
            status: "reclassified",
            account: opp.account.username,
          });
        } else {
          // Comment is actually deleted
          console.log(`  ✗ Comment confirmed deleted`);
          actuallyDeleted++;
          results.push({
            id: opp.id,
            title: opp.title,
            status: "confirmed_deleted",
            account: opp.account.username,
          });
        }
      } catch (error) {
        console.error(`  ERROR: ${error instanceof Error ? error.message : "Unknown error"}`);
        errors++;
        results.push({
          id: opp.id,
          title: opp.title,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Wait 3 seconds between checks to avoid rate limiting
      if (checked < deletedOpportunities.length) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }

    const summary = {
      totalChecked: checked,
      reclassified,
      confirmedDeleted: actuallyDeleted,
      errors,
      results,
    };

    console.log("[Reclassify] Complete:", summary);

    return c.json(summary);
  } catch (error) {
    console.error("[Reclassify] Fatal error:", error);
    return c.json(
      { error: "Reclassification failed", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

export default app;
