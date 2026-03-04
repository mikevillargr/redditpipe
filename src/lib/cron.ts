import cron from "node-cron";
import { prisma } from "./prisma";

let initialized = false;
let searchTimer: ReturnType<typeof setInterval> | null = null;
let currentIntervalMins = 0;

async function runSearch() {
  console.log("[Cron] Running scheduled search pipeline...");
  try {
    const res = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/search/run`,
      { method: "POST", signal: AbortSignal.timeout(600_000) } // 10 min timeout
    );
    const data = await res.json();
    if (data.error) {
      console.error("[Cron] Search error:", data.error, data.details || "");
    } else {
      console.log("[Cron] Search complete:", JSON.stringify(data.summary));
    }
    if (data.errors?.length) {
      console.warn("[Cron] Search warnings:", data.errors);
    }
  } catch (error) {
    console.error("[Cron] Search failed:", error);
  }
}

async function scheduleSearchJobs() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const frequency = settings?.searchFrequency || "continuous";
    const intervalMins = settings?.pollingIntervalMins ?? 10;

    // If manual mode, stop any running timer
    if (frequency !== "continuous") {
      if (searchTimer) {
        clearInterval(searchTimer);
        searchTimer = null;
        currentIntervalMins = 0;
        console.log("[Cron] Search mode is manual — polling stopped.");
      }
      return;
    }

    // If interval hasn't changed, keep existing timer
    if (searchTimer && currentIntervalMins === intervalMins) {
      return;
    }

    // Stop old timer and start new one
    if (searchTimer) {
      clearInterval(searchTimer);
      console.log(`[Cron] Polling interval changed: ${currentIntervalMins}m → ${intervalMins}m`);
    }

    currentIntervalMins = intervalMins;
    const intervalMs = intervalMins * 60 * 1000;

    searchTimer = setInterval(runSearch, intervalMs);
    console.log(`[Cron] Search polling every ${intervalMins} minutes (next run in ${intervalMins}m)`);

    // Run immediately on first schedule
    if (!initialized) {
      console.log("[Cron] Running initial search on startup...");
      // Delay slightly to let the server fully start
      setTimeout(runSearch, 5000);
    }
  } catch (error) {
    console.error("[Cron] Failed to schedule search jobs:", error);
  }
}

export async function initCronJobs() {
  if (initialized) return;

  console.log("[Cron] Initializing cron jobs...");

  // Schedule search jobs from settings (and refresh every 5 min)
  await scheduleSearchJobs();
  initialized = true;
  cron.schedule("*/5 * * * *", scheduleSearchJobs);

  // Reset Daily Counts — Midnight
  cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Resetting daily post counts...");
    try {
      await prisma.redditAccount.updateMany({
        data: { postsTodayCount: 0 },
      });
      console.log("[Cron] Daily counts reset.");
    } catch (error) {
      console.error("[Cron] Daily count reset failed:", error);
    }
  });

  // Reset Weekly Counts — Monday Midnight
  cron.schedule("0 0 * * 1", async () => {
    console.log("[Cron] Resetting weekly counts...");
    try {
      await prisma.redditAccount.updateMany({
        data: {
          organicPostsWeek: 0,
          citationPostsWeek: 0,
        },
      });
      console.log("[Cron] Weekly counts reset.");
    } catch (error) {
      console.error("[Cron] Weekly count reset failed:", error);
    }
  });

  // Cooldown Check — Every 30 minutes
  cron.schedule("*/30 * * * *", async () => {
    try {
      const cooldownAccounts = await prisma.redditAccount.findMany({
        where: { status: "cooldown" },
      });

      for (const account of cooldownAccounts) {
        if (account.lastPostAt) {
          const hoursSinceLastPost =
            (Date.now() - account.lastPostAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastPost >= account.minHoursBetweenPosts) {
            await prisma.redditAccount.update({
              where: { id: account.id },
              data: { status: "active" },
            });
            console.log(
              `[Cron] Account ${account.username} reactivated from cooldown.`
            );
          }
        }
      }
    } catch (error) {
      console.error("[Cron] Cooldown check failed:", error);
    }
  });

  console.log("[Cron] All cron jobs scheduled.");
}
