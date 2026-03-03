import cron from "node-cron";
import { prisma } from "./prisma";

let initialized = false;

export function initCronJobs() {
  if (initialized) return;
  initialized = true;

  console.log("[Cron] Initializing cron jobs...");

  // Daily Search — 6 AM
  cron.schedule("0 6 * * *", async () => {
    console.log("[Cron] Running daily search pipeline...");
    try {
      const res = await fetch(
        `http://localhost:${process.env.PORT || 3000}/api/search/run`,
        { method: "POST" }
      );
      const data = await res.json();
      console.log("[Cron] Daily search complete:", data.summary);
    } catch (error) {
      console.error("[Cron] Daily search failed:", error);
    }
  });

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
