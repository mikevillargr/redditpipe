import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { clearApiKeyCache, testConnection } from "../lib/ai.js";
import { clearAIClientCache } from "../lib/ai-client.js";
import { getRedditAccessToken } from "../lib/reddit.js";
import { refreshSearchSchedule, refreshDeletionCheckSchedule } from "../lib/cron.js";
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
      zaiApiKey: maskSecret(settings.zaiApiKey),
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// PUT /api/settings
const ALLOWED_FIELDS = new Set([
  "redditApiMode", "redditClientId", "redditClientSecret", "redditUsername", "redditPassword",
  "anthropicApiKey", "zaiApiKey", "specialInstructions", "searchFrequency", "searchScheduleTimes", "searchTimezone",
  "maxResultsPerKeyword", "threadMaxAgeDays", "relevanceThreshold", "aiSearchContext",
  "aiModelScoring", "aiModelReplies", "aiModelDetection", "searchBreadth",
  "maxAiCandidatesPerClient", "maxAiCallsTotal", "maxOppsPerClient", "maxOppsTotal",
  "pileOnEnabled", "pileOnDelayMinHours", "pileOnDelayMaxHours", "pileOnMaxPerOpportunity", "pileOnCooldownDays",
  "pileOnAutoCreate", "pileOnMaxPerPrimary",
  "deletionCheckEnabled", "deletionCheckTime", "deletionCheckTimezone", "deletionCheckDays",
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
    clearAIClientCache();
    clearScoringCache();
    refreshSearchSchedule().catch((err) => console.error("[Settings] Failed to refresh schedule:", err));
    refreshDeletionCheckSchedule().catch((err) => console.error("[Settings] Failed to refresh deletion check schedule:", err));

    return c.json({
      ...settings,
      redditClientId: maskSecret(settings.redditClientId),
      redditClientSecret: maskSecret(settings.redditClientSecret),
      redditPassword: maskSecret(settings.redditPassword),
      anthropicApiKey: maskSecret(settings.anthropicApiKey),
      zaiApiKey: maskSecret(settings.zaiApiKey),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("PUT /api/settings error:", msg, error);
    return c.json({ error: `Failed to update settings: ${msg}` }, 500);
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
    const result = await testConnection();
    return c.json(result);
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
});

// POST /api/settings/test-special-instructions
app.post("/test-special-instructions", async (c) => {
  try {
    const body = await c.req.json();
    const { specialInstructions } = body;

    const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
    const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return c.json({ error: "No AI API key configured" }, 400);
    }

    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const ai = new Anthropic({ apiKey });

    // Sample scenario for testing
    const basePrompt = `You are writing a Reddit reply as a helpful community member.

RULES:
- Be genuinely helpful — answer the question FIRST, then naturally work in the recommendation
- Do NOT use marketing language or superlatives
- Keep it 2-4 short paragraphs max
- Sound like a real person sharing genuine experience

REDDIT MARKDOWN FORMAT:
- Use Reddit markdown syntax: **bold**, *italic*
- When mentioning any product, tool, or service, ALWAYS include a clickable link: [Product Name](https://example.com)
- Use line breaks between paragraphs (double newline)`;

    let systemPrompt = basePrompt;
    if (specialInstructions) {
      systemPrompt += `\n\nSPECIAL INSTRUCTIONS:\n${specialInstructions}`;
    }

    const userPrompt = `THREAD CONTEXT:
Subreddit: r/Entrepreneur
Title: What's the best tool for managing social media content?
Thread body: I'm running a small business and struggling to keep up with posting on multiple platforms. Looking for recommendations on tools that can help schedule and manage content across different social media channels.

CLIENT TO REFERENCE:
Name: Buffer
URL: https://buffer.com
Description: Social media management platform for scheduling and analytics

Write a Reddit reply now.`;

    const response = await ai.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return c.json({ error: "No text response from AI" }, 500);
    }

    return c.json({
      success: true,
      response: textBlock.text,
      promptUsed: systemPrompt,
    });
  } catch (error) {
    console.error("POST /api/settings/test-special-instructions error:", error);
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
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
