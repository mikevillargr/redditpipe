import { createPrismaClient } from "./prisma.js";
import { getRedditConfig } from "./reddit.js";

interface DeletionCheckResult {
  checked: number;
  deleted: number;
  errors: string[];
  lastRunAt: Date;
}

let lastCheckResult: DeletionCheckResult | null = null;
let isRunning = false;

/**
 * Check if a comment exists at the given permalink from any of our valid authors
 * Returns true if comment exists from any valid author, false if deleted/removed or no valid author found
 */
export async function checkCommentExists(permalinkUrl: string, validAuthors?: string[]): Promise<boolean> {
  try {
    // Parse permalink to get the JSON endpoint
    // Reddit permalink format: https://www.reddit.com/r/subreddit/comments/threadid/title/commentid/
    // or user profile: https://www.reddit.com/user/username/comments/
    const url = new URL(permalinkUrl);
    const jsonUrl = `${url.origin}${url.pathname}.json`;

    const config = await getRedditConfig();
    const headers: Record<string, string> = {
      "User-Agent": "RedditPipe/2.0",
    };

    // Add OAuth if available
    if (config.mode === "oauth" && config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    const response = await fetch(jsonUrl, { headers });

    if (!response.ok) {
      // 404 means comment doesn't exist
      if (response.status === 404) {
        console.log(`[DeletionDetection] 404 for ${permalinkUrl}`);
        return false;
      }
      console.warn(`[DeletionDetection] Reddit API returned ${response.status} for ${permalinkUrl}`);
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();

    // Reddit returns different structures depending on the permalink type:
    // 1. Full comment permalink: [thread_listing, comment_listing]
    // 2. User profile comment: {kind: "Listing", data: {children: [...]}}
    
    // Handle user profile comments (single listing object)
    if (!Array.isArray(data) && data.kind === "Listing") {
      const children = data.data?.children || [];
      if (children.length === 0) {
        console.log(`[DeletionDetection] No children in user profile listing for ${permalinkUrl}`);
        return false;
      }
      
      // For user profile, we need to find the comment from our account
      // The permalink might be /user/username/comments/ which shows all their comments
      // We need to verify at least one comment exists from the expected author
      let foundMatchingComment = false;
      for (const child of children) {
        const commentData = child?.data;
        if (!commentData) continue;
        
        const body = commentData.body || "";
        const author = commentData.author || "";
        
        // Skip deleted/removed comments
        if (body === "[removed]" || body === "[deleted]" || !body || author === "[deleted]") {
          continue;
        }
        
        // If validAuthors is provided, check if this comment is from any of them
        if (validAuthors && validAuthors.length > 0) {
          if (validAuthors.includes(author)) {
            foundMatchingComment = true;
            console.log(`[DeletionDetection] Found comment from ${author} (one of our accounts) in user profile`);
            break;
          }
        } else {
          // No valid authors specified, just check if any valid comment exists
          foundMatchingComment = true;
          break;
        }
      }
      
      if (!foundMatchingComment) {
        console.log(`[DeletionDetection] No matching comment found in user profile for ${validAuthors ? validAuthors.join(', ') : 'any author'}`);
        return false;
      }
      
      return true;
    }

    // Handle full comment permalink (array with thread and comment listings)
    if (!Array.isArray(data) || data.length < 2) {
      console.log(`[DeletionDetection] Unexpected data structure for ${permalinkUrl}`);
      return false;
    }

    const commentListing = data[1];
    if (!commentListing?.data?.children || commentListing.data.children.length === 0) {
      console.log(`[DeletionDetection] No comment children for ${permalinkUrl}`);
      return false;
    }

    // Extract comment ID from permalink to find the exact comment
    // Permalink format: /r/subreddit/comments/threadid/title/commentid/
    const commentIdMatch = permalinkUrl.match(/\/comments\/[^\/]+\/[^\/]+\/([^\/]+)/);
    const targetCommentId = commentIdMatch ? commentIdMatch[1] : null;

    // Recursively search for the comment with matching ID
    const findCommentById = (children: any[], commentId: string): any => {
      for (const child of children) {
        if (child?.data?.id === commentId) {
          return child.data;
        }
        // Check replies
        if (child?.data?.replies?.data?.children) {
          const found = findCommentById(child.data.replies.data.children, commentId);
          if (found) return found;
        }
      }
      return null;
    };

    let commentData;
    if (targetCommentId) {
      // Try to find comment by ID
      commentData = findCommentById(commentListing.data.children, targetCommentId);
      if (!commentData) {
        console.log(`[DeletionDetection] Could not find comment with ID ${targetCommentId} in tree`);
        // Fall back to first child (old behavior) but log it
        commentData = commentListing.data.children[0]?.data;
        console.log(`[DeletionDetection] Falling back to first child for ${permalinkUrl}`);
      }
    } else {
      // No comment ID found in URL, use first child
      commentData = commentListing.data.children[0]?.data;
    }

    if (!commentData) {
      console.log(`[DeletionDetection] No comment data for ${permalinkUrl}`);
      return false;
    }

    // Check if comment body is [removed] or [deleted] or author is deleted
    const body = commentData.body || "";
    const author = commentData.author || "";
    if (body === "[removed]" || body === "[deleted]" || !body || author === "[deleted]") {
      console.log(`[DeletionDetection] Comment deleted/removed: body="${body}", author="${author}"`);
      return false;
    }

    // If validAuthors is provided, verify author is one of them
    if (validAuthors && validAuthors.length > 0) {
      if (!validAuthors.includes(author)) {
        console.log(`[DeletionDetection] Author not in our pool: actual="${author}", valid authors=[${validAuthors.join(', ')}] for comment ID ${targetCommentId || 'unknown'}`);
        return false;
      }
      console.log(`[DeletionDetection] Comment exists for ${permalinkUrl}, author="${author}" (one of our accounts)`);
    } else {
      console.log(`[DeletionDetection] Comment exists for ${permalinkUrl}, author="${author}"`);
    }
    return true;
  } catch (error) {
    console.error("[DeletionDetection] Error checking comment:", error);
    // On error, assume comment exists to avoid false positives
    return true;
  }
}

/**
 * Check if an opportunity's comment has been deleted
 * Includes retry logic: checks twice before confirming deletion
 */
export async function checkOpportunityDeletion(
  opportunityId: string
): Promise<{ deleted: boolean; retried: boolean }> {
  const prisma = createPrismaClient();
  try {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { 
        account: {
          select: {
            username: true
          }
        }
      },
    });

    if (!opportunity?.threadUrl) {
      console.warn(`[DeletionDetection] No thread URL found for ${opportunityId}, skipping`);
      return { deleted: false, retried: false };
    }

    // Get all account usernames to check if ANY of our accounts has a comment on the thread
    const allAccounts = await prisma.redditAccount.findMany({
      select: { username: true },
    });
    const validAuthors = allAccounts.map(acc => acc.username);

    // Check the entire thread for comments from any of our accounts
    const threadUrl = opportunity.threadUrl.replace(/\/$/, "") + "/.json?limit=500&depth=10";
    const config = await getRedditConfig();
    const headers: Record<string, string> = {
      "User-Agent": "RedditPipe/2.0",
    };

    if (config.mode === "oauth" && config.token) {
      headers["Authorization"] = `Bearer ${config.token}`;
    }

    // First check
    const firstCheck = await checkThreadForOurComments(threadUrl, headers, validAuthors);
    if (firstCheck) {
      // Found comment from one of our accounts on the thread
      return { deleted: false, retried: false };
    }

    // No comments found, wait 10 seconds and retry (reduced from 30s)
    console.log(`[DeletionDetection] No comments found on thread for ${opportunityId}, retrying in 10s...`);
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Second check (retry)
    const secondCheck = await checkThreadForOurComments(threadUrl, headers, validAuthors);
    return { deleted: !secondCheck, retried: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Check if any comments from our accounts exist anywhere on the thread
 */
async function checkThreadForOurComments(
  threadJsonUrl: string,
  headers: Record<string, string>,
  validAuthors: string[]
): Promise<boolean> {
  try {
    const response = await fetch(threadJsonUrl, { headers });
    
    if (!response.ok) {
      console.warn(`[DeletionDetection] Reddit API returned ${response.status}`);
      return true; // Assume exists on error to avoid false positives
    }

    const data = await response.json();

    // Recursively search for comments from our accounts
    const findOurComments = (children: any[]): boolean => {
      for (const child of children || []) {
        if (child.kind === "t1") {
          const commentData = child.data;
          const author = commentData.author || "";
          const body = commentData.body || "";

          // Skip deleted/removed comments
          if (body === "[removed]" || body === "[deleted]" || author === "[deleted]") {
            continue;
          }

          // Check if this is from one of our accounts
          if (validAuthors.includes(author)) {
            console.log(`[DeletionDetection] Found comment from ${author} on thread`);
            return true;
          }

          // Check replies
          if (commentData.replies?.data?.children) {
            if (findOurComments(commentData.replies.data.children)) {
              return true;
            }
          }
        }
      }
      return false;
    };

    const foundInThread = findOurComments(data[1]?.data?.children || []);
    
    if (foundInThread) {
      return true;
    }

    // Fallback: Reddit's JSON API doesn't always return all comments
    // Check each account's recent comment history to see if they commented on this thread
    const threadId = threadJsonUrl.match(/\/comments\/([^\/]+)\//)?.[1];
    if (!threadId) {
      return false;
    }

    console.log(`[DeletionDetection] Comment not found in thread JSON, checking user histories for thread ${threadId}`);

    // Add small delay before user history checks
    await new Promise(resolve => setTimeout(resolve, 1000));

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
            
            // Check if this comment is on our thread (link_id format: t3_threadid)
            if (linkId === `t3_${threadId}`) {
              const body = commentData.body || "";
              const commentId = commentData.id || "";
              
              // Make sure it's not deleted in user history
              if (body !== "[removed]" && body !== "[deleted]" && body) {
                // Verify the comment is actually accessible via its permalink
                // Reddit keeps deleted comments in user history, so we need to double-check
                const permalinkUrl = `https://www.reddit.com/r/${commentData.subreddit}/comments/${threadId}/comment/${commentId}/.json`;
                
                try {
                  // Add delay to avoid rate limits (2.5s to stay well under Reddit's limits)
                  await new Promise(resolve => setTimeout(resolve, 2500));
                  
                  const permalinkResponse = await fetch(permalinkUrl, { headers });
                  if (permalinkResponse.ok) {
                    const permalinkData = await permalinkResponse.json();
                    const hasChildren = permalinkData?.[1]?.data?.children?.length > 0;
                    
                    if (hasChildren) {
                      console.log(`[DeletionDetection] Found comment from ${username} on thread via user history (verified via permalink)`);
                      return true;
                    } else {
                      console.log(`[DeletionDetection] Comment ${commentId} in user history but deleted from thread`);
                    }
                  } else if (permalinkResponse.status === 429) {
                    console.warn(`[DeletionDetection] Rate limited verifying ${commentId}, assuming exists to avoid false positive`);
                    return true; // Assume exists on rate limit
                  }
                } catch (error) {
                  console.warn(`[DeletionDetection] Error verifying permalink for ${commentId}:`, error);
                  // Don't return true if we can't verify
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[DeletionDetection] Error checking ${username} history:`, error);
        continue;
      }
    }

    return false;
  } catch (error) {
    console.error("[DeletionDetection] Error checking thread:", error);
    return true; // Assume exists on error to avoid false positives
  }
}

/**
 * Run deletion detection on all published opportunities within the configured timeframe
 */
export async function runDeletionDetection(): Promise<DeletionCheckResult> {
  if (isRunning) {
    console.log("[DeletionDetection] Check already running, skipping.");
    throw new Error("Deletion check already in progress");
  }

  isRunning = true;
  const prisma = createPrismaClient();
  const errors: string[] = [];
  let checked = 0;
  let deleted = 0;

  try {
    console.log("[DeletionDetection] Starting deletion check...");

    // Get settings
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const deletionCheckDays = settings?.deletionCheckDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - deletionCheckDays);

    // Fetch published opportunities (both primary and pile-on) with permalinks from the last N days
    // Use createdAt since publishedAt may be null for older opportunities
    const opportunities = await prisma.opportunity.findMany({
      where: {
        status: "published",
        permalinkUrl: { not: null },
        createdAt: { gte: cutoffDate },
      },
      select: {
        id: true,
        permalinkUrl: true,
        title: true,
        subreddit: true,
        opportunityType: true,
      },
    });

    console.log(`[DeletionDetection] Checking ${opportunities.length} published opportunities from last ${deletionCheckDays} days...`);

    // Check each opportunity
    for (const opp of opportunities) {
      try {
        checked++;
        
        // Add delay between opportunities to avoid rate limits
        if (checked > 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        const result = await checkOpportunityDeletion(opp.id);

        if (result.deleted) {
          // Mark as deleted
          await prisma.opportunity.update({
            where: { id: opp.id },
            data: {
              status: "deleted_by_mod",
              deletedAt: new Date(),
            },
          });
          deleted++;
          const oppType = opp.opportunityType === 'pile_on' ? 'pile-on' : 'primary';
          console.log(`[DeletionDetection] Marked as deleted (${oppType}): ${opp.title} (r/${opp.subreddit})`);
        }

        // Add delay between checks to avoid rate limiting (2 seconds)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        const errorMsg = `Failed to check opportunity ${opp.id}: ${error}`;
        console.error(`[DeletionDetection] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const result: DeletionCheckResult = {
      checked,
      deleted,
      errors,
      lastRunAt: new Date(),
    };

    lastCheckResult = result;
    console.log(`[DeletionDetection] Check complete: ${deleted} deleted out of ${checked} checked`);
    return result;
  } catch (error) {
    console.error("[DeletionDetection] Check failed:", error);
    throw error;
  } finally {
    isRunning = false;
    await prisma.$disconnect().catch(() => {});
  }
}

/**
 * Get the last deletion check result
 */
export function getLastCheckResult(): DeletionCheckResult | null {
  return lastCheckResult;
}

/**
 * Check if a deletion check is currently running
 */
export function isDeletionCheckRunning(): boolean {
  return isRunning;
}
