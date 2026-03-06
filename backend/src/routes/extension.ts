import { Hono } from "hono";

const app = new Hono();

// GET /api/extension/status — health check for Chrome extension
app.get("/status", (c) => {
  return c.json({ connected: true, version: "1.0.0" });
});

export default app;
