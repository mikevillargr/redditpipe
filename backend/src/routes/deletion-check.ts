import { Hono } from "hono";
import { runDeletionDetection, getLastCheckResult, isDeletionCheckRunning } from "../lib/deletion-detection.js";

const app = new Hono();

// POST /api/deletion-check/run - Manually trigger deletion check
app.post("/run", async (c) => {
  try {
    if (isDeletionCheckRunning()) {
      return c.json({ error: "Deletion check already in progress" }, 409);
    }

    // Run deletion check asynchronously
    runDeletionDetection().catch((error) => {
      console.error("[API] Deletion check failed:", error);
    });

    return c.json({ message: "Deletion check started" });
  } catch (error) {
    console.error("[API] Failed to start deletion check:", error);
    return c.json({ error: "Failed to start deletion check" }, 500);
  }
});

// GET /api/deletion-check/status - Get deletion check status
app.get("/status", async (c) => {
  try {
    const lastResult = getLastCheckResult();
    const isRunning = isDeletionCheckRunning();

    return c.json({
      isRunning,
      lastResult: lastResult
        ? {
            checked: lastResult.checked,
            deleted: lastResult.deleted,
            errors: lastResult.errors,
            lastRunAt: lastResult.lastRunAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error("[API] Failed to get deletion check status:", error);
    return c.json({ error: "Failed to get status" }, 500);
  }
});

export default app;
