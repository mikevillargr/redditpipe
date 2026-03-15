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

        let exists = findOurComments(data[1]?.data?.children || []);

        // Fallback: If not found in thread JSON, check user comment histories
        if (!exists) {
          const threadId = opp.threadUrl.match(/\/comments\/([^\/]+)\//)?.[1];
          if (threadId) {
            console.log(`  Comment not found in thread JSON, checking user histories for thread ${threadId}`);
            
            for (const username of validAuthors) {
              try {
                const userCommentsUrl = `https://www.reddit.com/user/${username}/comments.json?limit=100`;
                const userResponse = await fetch(userCommentsUrl, { headers });
                
                if (!userResponse.ok) {
                  continue;
                }

                const userData = await userResponse.json();
                const userComments = userData?.data?.children || [];

                for (const comment of userComments) {
                  if (comment.kind === "t1") {
                    const commentData = comment.data;
                    const linkId = commentData.link_id || "";
                    
                    if (linkId === `t3_${threadId}`) {
                      const body = commentData.body || "";
                      const commentId = commentData.id || "";
                      
                      if (body !== "[removed]" && body !== "[deleted]" && body) {
                        // Verify the comment is actually accessible via its permalink
                        // Reddit keeps deleted comments in user history
                        const subreddit = commentData.subreddit || "";
                        const permalinkUrl = `https://www.reddit.com/r/${subreddit}/comments/${threadId}/comment/${commentId}/.json`;
                        
                        try {
                          // Add delay to avoid rate limits (2.5s to stay well under Reddit's limits)
                          await new Promise(resolve => setTimeout(resolve, 2500));
                          
                          const permalinkResponse = await fetch(permalinkUrl, { headers });
                          if (permalinkResponse.ok) {
                            const permalinkData = await permalinkResponse.json();
                            const hasChildren = permalinkData?.[1]?.data?.children?.length > 0;
                            
                            if (hasChildren) {
                              console.log(`  ✓ Found comment from ${username} via user history (verified via permalink)`);
                              exists = true;
                              break;
                            } else {
                              console.log(`  Comment ${commentId} in user history but deleted from thread`);
                            }
                          } else if (permalinkResponse.status === 429) {
                            console.warn(`  Rate limited verifying ${commentId}, assuming exists to avoid false positive`);
                            exists = true;
                            break;
                          }
                        } catch (error) {
                          console.warn(`  Error verifying permalink for ${commentId}:`, error);
                        }
                      }
                    }
                  }
                }
                
                if (exists) break;
              } catch (error) {
                console.warn(`  Error checking ${username} history:`, error);
                continue;
              }
            }
          }
        }

        if (exists) {
          // Comment still exists from one of our accounts - this was a false positive!
          console.log(`  ✓ COMMENT EXISTS - Reclassifying to published`);

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
