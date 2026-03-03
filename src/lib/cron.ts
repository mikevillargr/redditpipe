import cron from "node-cron";
import { prisma } from "./prisma";

let initialized = false;
let searchTasks: ReturnType<typeof cron.schedule>[] = [];

async function runSearch() {
  console.log("[Cron] Running scheduled search pipeline...");
  try {
    const res = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/search/run`,
      { method: "POST" }
    );
    const data = await res.json();
    console.log("[Cron] Search complete:", data.summary);
  } catch (error) {
    console.error("[Cron] Search failed:", error);
  }
}

async function scheduleSearchJobs() {
  // Stop existing search tasks
  for (const task of searchTasks) {
    task.stop();
  }
  searchTasks = [];

  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const times = (settings?.searchTimes || "09:00")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const tz = settings?.searchTimezone || "UTC";

    for (const time of times) {
      const [hour, minute] = time.split(":").map(Number);
      if (isNaN(hour) || isNaN(minute)) continue;

      const cronExpr = `${minute} ${hour} * * *`;
      const task = cron.schedule(cronExpr, runSearch, { timezone: tz });
      searchTasks.push(task);
      console.log(`[Cron] Search scheduled at ${time} ${tz}`);
    }
  } catch (error) {
    console.error("[Cron] Failed to schedule search jobs:", error);
  }
}

export function initCronJobs() {
  if (initialized) return;
  initialized = true;

  console.log("[Cron] Initializing cron jobs...");

  // Schedule search jobs from settings (and refresh every 5 min)
  scheduleSearchJobs();
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
