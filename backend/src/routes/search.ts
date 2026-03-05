import { Hono } from "hono";
import { getPipelineStatus, abortSearch } from "../lib/search-pipeline.js";
import { runSearch } from "../lib/cron.js";

const app = new Hono();

// POST /api/search/run
app.post("/run", async (c) => {
  const status = getPipelineStatus();
  if (status.running) {
    return c.json(
      { error: "Search already running", phase: status.phase, progress: status.progress },
      409
    );
  }
  runSearch().catch((err) => console.error("[API] Search failed:", err));
  return c.json({ message: "Search started", status: "running" });
});

// POST /api/search/stop
app.post("/stop", async (c) => {
  const stopped = abortSearch();
  if (!stopped) {
    return c.json({ error: "No search running to stop" }, 409);
  }
  return c.json({ message: "Stop signal sent — pipeline will halt at next checkpoint" });
});

// GET /api/search/status
app.get("/status", async (c) => {
  return c.json(getPipelineStatus());
});

export default app;
