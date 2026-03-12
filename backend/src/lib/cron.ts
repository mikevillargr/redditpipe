import cron from "node-cron";
import { createPrismaClient } from "./prisma.js";
import { runSearchPipeline } from "./search-pipeline.js";
import { runDeletionDetection } from "./deletion-detection.js";

let initialized = false;
let searchRunning = false;
let searchTask: ReturnType<typeof cron.schedule> | null = null;
let deletionCheckTask: ReturnType<typeof cron.schedule> | null = null;

async function runSearch() {
  if (searchRunning) {
    console.log("[Cron] Search already running, skipping.");
    return;
  }
  searchRunning = true;
  console.log("[Cron] Running search pipeline...");
  try {
    const result = await runSearchPipeline();
    console.log("[Cron] Search complete:", JSON.stringify(result.summary));
  } catch (error) {
    console.error("[Cron] Search failed:", error);
  } finally {
    searchRunning = false;
  }
}

export { runSearch };

async function runDeletionCheck() {
  console.log("[Cron] Running deletion check...");
  try {
    const result = await runDeletionDetection();
    console.log(`[Cron] Deletion check complete: ${result.deleted} deleted out of ${result.checked} checked`);
  } catch (error) {
    console.error("[Cron] Deletion check failed:", error);
  }
}

export { runDeletionCheck };

async function runDeletionAnalysis() {
  console.log("[Cron] Running automated deletion analysis...");
  const db = createPrismaClient();
  try {
    // Find deleted opportunities that haven't been analyzed yet
    const deletedOpps = await db.opportunity.findMany({
      where: {
        status: "deleted_by_mod",
        deletionAnalysis: null,
      },
      take: 50, // Analyze up to 50 per run to avoid overwhelming the AI API
    });

    if (deletedOpps.length === 0) {
      console.log("[Cron] No unanalyzed deletions found.");
      return;
    }

    console.log(`[Cron] Found ${deletedOpps.length} unanalyzed deletions. Triggering analysis via API...`);
    
    let analyzed = 0;
    let failed = 0;

    // Call the analysis endpoint for each deletion
    for (const opp of deletedOpps) {
      try {
        const response = await fetch(`http://localhost:8000/api/deletion-analysis/analyze/${opp.id}`, {
          method: 'POST',
        });
        
        if (response.ok) {
          analyzed++;
          console.log(`[Cron] Analyzed deletion ${opp.id} (${analyzed}/${deletedOpps.length})`);
        } else {
          failed++;
          const data = await response.json();
          console.error(`[Cron] Failed to analyze ${opp.id}:`, data.error);
        }
      } catch (error) {
        failed++;
        console.error(`[Cron] Failed to analyze ${opp.id}:`, error);
      }
    }

    console.log(`[Cron] Deletion analysis complete: ${analyzed} analyzed, ${failed} failed`);
  } catch (error) {
    console.error("[Cron] Deletion analysis failed:", error);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

export { runDeletionAnalysis };

function buildSearchCron(frequency: string, scheduleTimes: string): string | null {
  if (frequency === "manual") return null;

  // Parse comma-separated HH:MM times
  const times = scheduleTimes.split(",").map((t) => t.trim()).filter(Boolean);
  if (times.length === 0) return null;

  if (frequency === "once_daily") {
    const [h, m] = (times[0] || "09:00").split(":");
    return `${parseInt(m || "0", 10)} ${parseInt(h || "9", 10)} * * *`;
  }

  if (frequency === "twice_daily") {
    const hours = times.slice(0, 2).map((t) => {
      const [h] = t.split(":");
      return parseInt(h || "9", 10);
    });
    if (hours.length === 1) hours.push((hours[0] + 12) % 24);
    const mins = times.map((t) => {
      const parts = t.split(":");
      return parseInt(parts[1] || "0", 10);
    });
    // Use minute from first time for simplicity
    return `${mins[0] || 0} ${hours.join(",")} * * *`;
  }

  return null;
}

export async function refreshSearchSchedule(): Promise<void> {
  const db = createPrismaClient();
  try {
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const frequency = settings?.searchFrequency || "once_daily";
    const scheduleTimes = (settings as Record<string, unknown>)?.searchScheduleTimes as string || "09:00";
    const timezone = settings?.searchTimezone || "UTC";

    // Stop existing search task
    if (searchTask) {
      searchTask.stop();
      searchTask = null;
    }

    const cronExpr = buildSearchCron(frequency, scheduleTimes);
    if (cronExpr && process.env.ENABLE_CRON === "true") {
      searchTask = cron.schedule(cronExpr, runSearch, { timezone });
      console.log(`[Cron] Search rescheduled: "${cronExpr}" (${frequency}, times: ${scheduleTimes}, tz: ${timezone})`);
    } else if (frequency === "manual") {
      console.log("[Cron] Search set to manual-only mode.");
    }
  } catch (error) {
    console.error("[Cron] Failed to refresh schedule:", error);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

export async function refreshDeletionCheckSchedule(): Promise<void> {
  const db = createPrismaClient();
  try {
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const enabled = (settings as Record<string, unknown>)?.deletionCheckEnabled !== false;
    const checkTime = (settings as Record<string, unknown>)?.deletionCheckTime as string || "19:00";
    const timezone = (settings as Record<string, unknown>)?.deletionCheckTimezone as string || "UTC";

    // Stop existing deletion check task
    if (deletionCheckTask) {
      deletionCheckTask.stop();
      deletionCheckTask = null;
    }

    if (enabled && process.env.ENABLE_CRON === "true") {
      const [h, m] = checkTime.split(":");
      const cronExpr = `${parseInt(m || "0", 10)} ${parseInt(h || "19", 10)} * * *`;
      deletionCheckTask = cron.schedule(cronExpr, runDeletionCheck, { timezone });
      console.log(`[Cron] Deletion check scheduled: "${cronExpr}" (time: ${checkTime}, tz: ${timezone})`);
    } else if (!enabled) {
      console.log("[Cron] Deletion check disabled.");
    }
  } catch (error) {
    console.error("[Cron] Failed to refresh deletion check schedule:", error);
  } finally {
    await db.$disconnect().catch(() => {});
  }
}

export async function initCronJobs() {
  if (initialized) return;
  initialized = true;

  const cronEnabled = process.env.ENABLE_CRON === "true";
  if (!cronEnabled) {
    console.log("[Cron] Cron disabled (ENABLE_CRON !== 'true'). Use manual trigger in UI.");
  }

  console.log("[Cron] Initializing cron jobs...");

  // Schedule search based on DB settings
  await refreshSearchSchedule();

  // Schedule deletion check based on DB settings
  await refreshDeletionCheckSchedule();

  // No auto-run on startup — only the cron schedule or manual trigger should start searches.
  // Previous behavior: setTimeout(runSearch, 10000) caused unscheduled runs on every deploy.

  // Automated Deletion Analysis — Daily at 8 PM UTC
  if (cronEnabled) {
    cron.schedule("0 20 * * *", runDeletionAnalysis);
    console.log("[Cron] Deletion analysis scheduled: daily at 8 PM UTC");
  }

  // Reset Daily Counts — Midnight UTC
  cron.schedule("0 0 * * *", async () => {
    const db = createPrismaClient();
    try {
      await db.redditAccount.updateMany({ data: { postsTodayCount: 0 } });
      console.log("[Cron] Daily counts reset.");
    } catch (error) {
      console.error("[Cron] Daily count reset failed:", error);
    } finally {
      await db.$disconnect().catch(() => {});
    }
  });

  // Cooldown Check — Every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    const db = createPrismaClient();
    try {
      const cooldownAccounts = await db.redditAccount.findMany({ where: { status: "cooldown" } });
      for (const account of cooldownAccounts) {
        if (account.lastPostAt) {
          const hours = (Date.now() - account.lastPostAt.getTime()) / (1000 * 60 * 60);
          if (hours >= account.minHoursBetweenPosts) {
            await db.redditAccount.update({ where: { id: account.id }, data: { status: "active" } });
            console.log(`[Cron] ${account.username} reactivated from cooldown.`);
          }
        }
      }
    } catch (error) {
      console.error("[Cron] Cooldown check failed:", error);
    } finally {
      await db.$disconnect().catch(() => {});
    }
  });

  console.log("[Cron] All jobs scheduled.");
}
