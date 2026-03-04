import cron from "node-cron";
import { createPrismaClient } from "./prisma";
import { runSearchPipeline } from "./search-pipeline";

let initialized = false;
let searchRunning = false;

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

// Exported so the manual trigger API can call it
export { runSearch };

export async function initCronJobs() {
  if (initialized) return;
  initialized = true;

  // Guard: only run cron in production with ENABLE_CRON=true
  const cronEnabled = process.env.ENABLE_CRON === "true";
  if (!cronEnabled) {
    console.log("[Cron] Cron disabled (ENABLE_CRON !== 'true'). Use manual trigger in UI.");
    return;
  }

  console.log("[Cron] Initializing cron jobs...");

  // Search digest: 6am and 2pm UTC (adjust to your timezone)
  cron.schedule("0 6,14 * * *", runSearch);
  console.log("[Cron] Search scheduled at 6:00 and 14:00 UTC");

  // Run initial search on startup (delayed 5s for server to be ready)
  setTimeout(runSearch, 5000);

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

  // Reset Weekly Counts — Monday Midnight UTC
  cron.schedule("0 0 * * 1", async () => {
    const db = createPrismaClient();
    try {
      await db.redditAccount.updateMany({ data: { organicPostsWeek: 0, citationPostsWeek: 0 } });
      console.log("[Cron] Weekly counts reset.");
    } catch (error) {
      console.error("[Cron] Weekly count reset failed:", error);
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
