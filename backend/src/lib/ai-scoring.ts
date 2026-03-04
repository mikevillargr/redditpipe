import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma.js";
import { VALID_MODELS, DEFAULT_MODEL } from "./models.js";

let cachedConfig: { apiKey: string; model: string; context: string } | null = null;

async function getConfig(): Promise<{ apiKey: string; model: string; context: string }> {
  if (cachedConfig) return cachedConfig;
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const key = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");
  const requestedModel = settings?.aiModel || DEFAULT_MODEL;
  const model = VALID_MODELS.has(requestedModel) ? requestedModel : DEFAULT_MODEL;
  if (model !== requestedModel) {
    console.warn(`[AI Scoring] Model "${requestedModel}" is invalid, falling back to "${model}"`);
  }
  cachedConfig = { apiKey: key, model, context: settings?.aiSearchContext || "" };
  return cachedConfig;
}

export async function warmAiConfig(): Promise<void> {
  try {
    await getConfig();
    console.log("[AI Scoring] Config pre-fetched successfully");
  } catch (err) {
    console.warn("[AI Scoring] Config pre-fetch failed:", err instanceof Error ? err.message : err);
  }
}

export function clearScoringCache(): void {
  cachedConfig = null;
}

interface AiScoreResult {
  score: number;
  note: string;
  shouldKeep: boolean;
  factors?: {
    subredditRelevance: number;
    topicMatch: number;
    intent: number;
    naturalFit: number;
  };
}

interface AiScoreParams {
  threadTitle: string;
  threadBody: string;
  topComments: string;
  subreddit: string;
  clientName: string;
  clientDescription: string;
  clientKeywords: string[];
  clientNuance?: string | null;
  threshold: number;
}

export async function aiScoreRelevance(params: AiScoreParams): Promise<AiScoreResult> {
  const config = await getConfig();
  const client = new Anthropic({ apiKey: config.apiKey });

  const customContext = config.context
    ? `\nADDITIONAL SCORING CONTEXT FROM ADMIN:\n${config.context}\n`
    : "";

  const systemPrompt = `You are a strict opportunity scorer for a Reddit outreach tool. Evaluate whether a Reddit thread is a genuine opportunity to naturally recommend a client's product/service.

You MUST score on 4 factors (each 0.0 to 1.0):

1. SUBREDDIT RELEVANCE (weight: 30%) — Is this subreddit one where the client's target audience actually hangs out? A thread about LLC formation in r/smallbusiness is relevant. The same keyword match in r/AircraftEmergencies or r/CubanJetsTracker is NOT.

2. TOPIC MATCH (weight: 30%) — Does the thread's ACTUAL TOPIC directly relate to what the client offers? A keyword appearing in passing does NOT count. The core discussion must be about the client's domain.

3. INTENT (weight: 25%) — Is the poster seeking recommendations, advice, comparisons, or solutions? "Looking for X" or "help with Y" = high intent. News articles, memes, announcements = zero intent.

4. NATURAL FIT (weight: 15%) — Could someone mention this client naturally without seeming spammy? Would the recommendation genuinely help the poster?

SCORING GUIDE:
- 0.8+ = Perfect opportunity: right subreddit, on-topic, seeking recommendations
- 0.6-0.8 = Good: relevant discussion, could naturally mention client
- 0.4-0.6 = Marginal: some relevance but forced or off-topic subreddit
- Below 0.4 = Irrelevant: wrong audience, off-topic, or no intent

BE STRICT. Most threads should score below 0.5. Only truly relevant opportunities should pass.
${customContext}
Return ONLY JSON: {"score": <float 0-1>, "note": "<1-2 sentences explaining WHY this is or isn't a good fit>", "factors": {"subredditRelevance": <0-1>, "topicMatch": <0-1>, "intent": <0-1>, "naturalFit": <0-1>}}`;

  const nuanceBlock = params.clientNuance
    ? `\nSPECIAL FILTERING INSTRUCTIONS: ${params.clientNuance}\n`
    : "";

  const userPrompt = `CLIENT: ${params.clientName}
DESCRIPTION: ${params.clientDescription}
KEYWORDS: ${params.clientKeywords.join(", ")}${nuanceBlock}

THREAD:
Subreddit: r/${params.subreddit}
Title: ${params.threadTitle}
Body: ${params.threadBody.slice(0, 800)}
${params.topComments ? `Top Comments:\n${params.topComments.slice(0, 500)}` : ""}

Score this thread. Be strict — most threads are NOT good opportunities.`;

  try {
    const response = await Promise.race([
      client.messages.create({
        model: config.model,
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI scoring timed out after 30s")), 30_000)
      ),
    ]);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { score: 0.5, note: "AI scoring returned no text", shouldKeep: true };
    }

    let jsonStr = text.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(jsonStr) as {
      score: number;
      note: string;
      factors?: { subredditRelevance: number; topicMatch: number; intent: number; naturalFit: number };
    };
    return {
      score: Math.round(parsed.score * 100) / 100,
      note: parsed.note,
      shouldKeep: parsed.score >= params.threshold,
      factors: parsed.factors,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AI Scoring] Failed for "${params.clientName}" / r/${params.subreddit}: ${msg}`);
    return { score: 0.5, note: "AI scoring unavailable — using heuristic score", shouldKeep: true };
  }
}

interface DismissalPattern {
  pattern: string;
  count: number;
  examples: string[];
}

export async function analyzeDismissals(): Promise<{
  totalDismissed: number;
  patterns: DismissalPattern[];
  summary: string;
  recommendations: string[];
}> {
  const logs = await prisma.dismissalLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  if (logs.length === 0) {
    return {
      totalDismissed: 0,
      patterns: [],
      summary: "No dismissed opportunities yet. Patterns will appear as you dismiss irrelevant results.",
      recommendations: [],
    };
  }

  const config = await getConfig();
  const client = new Anthropic({ apiKey: config.apiKey });

  const dismissedSummary = logs
    .slice(0, 50)
    .map((d, i) => `${i + 1}. [r/${d.subreddit}] "${d.title}" (score: ${d.relevanceScore?.toFixed(2) || "N/A"}, client: ${d.clientName}) — Reason: ${d.reason}`)
    .join("\n");

  const response = await client.messages.create({
    model: config.model,
    max_tokens: 1000,
    system: `You analyze dismissed Reddit opportunities to identify patterns and improve future search relevance. Respond with ONLY a JSON object:
{
  "patterns": [{"pattern": "<description>", "count": <estimated count>, "examples": ["<title1>", "<title2>"]}],
  "summary": "<2-3 sentence overview of what's being dismissed and why>",
  "recommendations": ["<specific actionable suggestion to improve search>", ...]
}`,
    messages: [{ role: "user", content: `Analyze these ${logs.length} dismissed opportunities:\n\n${dismissedSummary}` }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return { totalDismissed: logs.length, patterns: [], summary: "Unable to analyze patterns", recommendations: [] };
  }

  try {
    let jsonStr = text.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(jsonStr) as { patterns: DismissalPattern[]; summary: string; recommendations: string[] };
    return { totalDismissed: logs.length, ...parsed };
  } catch {
    return { totalDismissed: logs.length, patterns: [], summary: text.text, recommendations: [] };
  }
}
