import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import opportunitiesRoutes from "./routes/opportunities.js";
import clientsRoutes from "./routes/clients.js";
import accountsRoutes from "./routes/accounts.js";
import settingsRoutes from "./routes/settings.js";
import searchRoutes from "./routes/search.js";
import authRoutes from "./routes/auth.js";
import { initCronJobs } from "./lib/cron.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors({
  origin: (origin) => origin || "*",
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
}));

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// Routes
app.route("/api/opportunities", opportunitiesRoutes);
app.route("/api/clients", clientsRoutes);
app.route("/api/accounts", accountsRoutes);
app.route("/api/settings", settingsRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/auth", authRoutes);

// Start server
const port = parseInt(process.env.PORT || "8000", 10);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[RedditPipe] Backend running on http://localhost:${info.port}`);
  // Initialize cron jobs after server is ready
  initCronJobs().catch((err) => console.error("[Cron] Init failed:", err));
});
