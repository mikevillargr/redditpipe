import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { clearApiKeyCache, testConnection } from "../lib/ai.js";
import { getRedditAccessToken } from "../lib/reddit.js";
import { refreshSearchSchedule } from "../lib/cron.js";
import { clearScoringCache } from "../lib/ai-scoring.js";

const app = new Hono();

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  return "****" + value.slice(-4);
}

// GET /api/settings
app.get("/", async (c) => {
  try {
    let settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    if (!settings) {
      settings = await prisma.settings.create({ data: { id: "singleton" } });
    }
    return c.json({
      ...settings,
      redditClientId: maskSecret(settings.redditClientId),
      redditClientSecret: maskSecret(settings.redditClientSecret),
      redditPassword: maskSecret(settings.redditPassword),
      anthropicApiKey: maskSecret(settings.anthropicApiKey),
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// PUT /api/settings
const ALLOWED_FIELDS = new Set([
  "redditApiMode", "redditClientId", "redditClientSecret", "redditUsername", "redditPassword",
  "anthropicApiKey", "searchFrequency", "searchScheduleTimes", "searchTimezone",
  "maxResultsPerKeyword", "threadMaxAgeDays", "relevanceThreshold", "aiSearchContext",
  "aiModelScoring", "aiModelReplies", "aiModelDetection", "searchBreadth",
]);

app.put("/", async (c) => {
  try {
    const body = await c.req.json();
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      if (typeof value === "string" && value.startsWith("****")) continue;
      data[key] = value;
    }

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    // Refresh caches and schedules when settings change
    clearApiKeyCache();
    clearScoringCache();
    refreshSearchSchedule().catch((err) => console.error("[Settings] Failed to refresh schedule:", err));

    return c.json({
      ...settings,
      redditClientId: maskSecret(settings.redditClientId),
      redditClientSecret: maskSecret(settings.redditClientSecret),
      redditPassword: maskSecret(settings.redditPassword),
      anthropicApiKey: maskSecret(settings.anthropicApiKey),
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return c.json({ error: "Failed to update settings" }, 500);
  }
});

// POST /api/settings/test-ai
app.post("/test-ai", async (c) => {
  try {
    clearApiKeyCache();
    let apiKey: string | undefined;
    try {
      const body = await c.req.json();
      if (body.apiKey && typeof body.apiKey === "string" && !body.apiKey.startsWith("****")) {
        apiKey = body.apiKey;
      }
    } catch { /* no body */ }
    const result = await testConnection(apiKey);
    return c.json(result);
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/settings/test-reddit
app.post("/test-reddit", async (c) => {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const clientId = settings?.redditClientId || process.env.REDDIT_CLIENT_ID;
    const clientSecret = settings?.redditClientSecret || process.env.REDDIT_CLIENT_SECRET;
    const username = settings?.redditUsername || process.env.REDDIT_USERNAME;
    const password = settings?.redditPassword || process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
      return c.json({ success: false, error: "Reddit API credentials not configured" }, 400);
    }

    await getRedditAccessToken(clientId, clientSecret, username, password);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default app;
