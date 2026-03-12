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
 * Check if a comment exists at the given permalink and matches the expected author
 * Returns true if comment exists and author matches, false if deleted/removed or author mismatch
 */
export async function checkCommentExists(permalinkUrl: string, expectedAuthor?: string): Promise<boolean> {
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
        
        // If expectedAuthor is provided, check if this comment is from them
        if (expectedAuthor) {
          if (author === expectedAuthor) {
            foundMatchingComment = true;
            console.log(`[DeletionDetection] Found comment from ${expectedAuthor} in user profile`);
            break;
          }
        } else {
          // No expected author, just check if any valid comment exists
          foundMatchingComment = true;
          break;
        }
      }
      
      if (!foundMatchingComment) {
        console.log(`[DeletionDetection] No matching comment found in user profile for ${expectedAuthor || 'any author'}`);
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

    const commentData = commentListing.data.children[0]?.data;
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

    // If expectedAuthor is provided, verify it matches
    if (expectedAuthor && author !== expectedAuthor) {
      console.log(`[DeletionDetection] Author mismatch: expected="${expectedAuthor}", actual="${author}"`);
      return false;
    }

    console.log(`[DeletionDetection] Comment exists for ${permalinkUrl}, author="${author}"`);
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

    if (!opportunity?.permalinkUrl) {
      return { deleted: false, retried: false };
    }

    const urlToCheck = opportunity.permalinkUrl;
    const expectedAuthor = opportunity.account?.username;

    if (!expectedAuthor) {
      console.warn(`[DeletionDetection] No account username found for ${opportunityId}, skipping`);
      return { deleted: false, retried: false };
    }

    // First check - verify our account's comment exists
    const firstCheck = await checkCommentExists(urlToCheck, expectedAuthor);
    if (firstCheck) {
      // Comment exists and author matches, no deletion
      return { deleted: false, retried: false };
    }

    // Comment appears deleted or author mismatch, wait 30 seconds and retry
    console.log(`[DeletionDetection] Comment appears deleted for ${opportunityId} (author: ${expectedAuthor}), retrying in 30s...`);
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Second check (retry)
    const secondCheck = await checkCommentExists(urlToCheck, expectedAuthor);
    return { deleted: !secondCheck, retried: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
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

    // Fetch published opportunities with permalinks from the last N days
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
      },
    });

    console.log(`[DeletionDetection] Checking ${opportunities.length} published opportunities from last ${deletionCheckDays} days...`);

    // Check each opportunity
    for (const opp of opportunities) {
      try {
        checked++;
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
          console.log(`[DeletionDetection] Marked as deleted: ${opp.title} (r/${opp.subreddit})`);
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
