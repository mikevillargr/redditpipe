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
 * Check if a comment exists at the given permalink
 * Returns true if comment exists, false if deleted/removed
 */
export async function checkCommentExists(permalinkUrl: string): Promise<boolean> {
  try {
    // Parse permalink to get the JSON endpoint
    // Reddit permalink format: https://www.reddit.com/r/subreddit/comments/threadid/title/commentid/
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
        return false;
      }
      throw new Error(`Reddit API returned ${response.status}`);
    }

    const data = await response.json();

    // Reddit returns an array with [thread_data, comment_data]
    // If comment is deleted/removed, the comment data will be empty or have [removed]/[deleted] body
    if (!Array.isArray(data) || data.length < 2) {
      return false;
    }

    const commentData = data[1]?.data?.children?.[0]?.data;
    if (!commentData) {
      return false;
    }

    // Check if comment body is [removed] or [deleted]
    const body = commentData.body || "";
    if (body === "[removed]" || body === "[deleted]" || !body) {
      return false;
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
      select: { permalinkUrl: true },
    });

    if (!opportunity?.permalinkUrl) {
      return { deleted: false, retried: false };
    }

    // First check
    const firstCheck = await checkCommentExists(opportunity.permalinkUrl);
    if (firstCheck) {
      // Comment exists, no deletion
      return { deleted: false, retried: false };
    }

    // Comment appears deleted, wait 30 seconds and retry
    console.log(`[DeletionDetection] Comment appears deleted for ${opportunityId}, retrying in 30s...`);
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Second check (retry)
    const secondCheck = await checkCommentExists(opportunity.permalinkUrl);
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
    const opportunities = await prisma.opportunity.findMany({
      where: {
        status: "published",
        permalinkUrl: { not: null },
        publishedAt: { gte: cutoffDate },
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
