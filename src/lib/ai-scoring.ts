import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma";

let cachedApiKey: string | null = null;
let cachedModel: string = "claude-sonnet-4-20250514";

async function getConfig(): Promise<{ apiKey: string; model: string; context: string }> {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  const key = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured");

  cachedApiKey = key;
  cachedModel = settings?.aiModel || "claude-sonnet-4-20250514";

  return {
    apiKey: key,
    model: cachedModel,
    context: settings?.aiSearchContext || "",
  };
}

export function clearScoringCache(): void {
  cachedApiKey = null;
}

interface AiScoreResult {
  score: number;
  note: string;
  shouldKeep: boolean;
}

interface AiScoreParams {
  threadTitle: string;
  threadBody: string;
  topComments: string;
  subreddit: string;
  clientName: string;
  clientDescription: string;
  clientKeywords: string[];
  threshold: number;
}

export async function aiScoreRelevance(params: AiScoreParams): Promise<AiScoreResult> {
  const config = await getConfig();
  const client = new Anthropic({ apiKey: config.apiKey });

  const customContext = config.context
    ? `\nADDITIONAL SCORING CONTEXT FROM ADMIN:\n${config.context}\n`
    : "";

  const systemPrompt = `You are an opportunity scorer for a Reddit outreach tool. Your job is to evaluate whether a Reddit thread is a good opportunity for naturally recommending a client's product/service.

SCORING CRITERIA (0.0 to 1.0):
- Is the poster ACTIVELY SEEKING a recommendation, advice, or solution? (highest weight)
- Does the topic directly relate to what the client offers?
- Could someone naturally mention the client without it feeling forced or spammy?
- Is this a genuine discussion (not a meme, news dump, or off-topic rant)?
- Would a recommendation feel helpful rather than promotional?

WHAT MAKES A GOOD OPPORTUNITY (score 0.7+):
- "Looking for recommendations for X" where X relates to the client
- "What tools/services do you use for Y?" where Y is client's domain
- "Need help with Z" where the client solves Z
- Comparison threads discussing alternatives in the client's space

WHAT IS A BAD OPPORTUNITY (score < 0.3):
- Local news, events, or culture posts that happen to mention a keyword
- Posts where the keyword appears but the discussion is unrelated to the client's services
- Memes, jokes, or rants that aren't seeking solutions
- Posts already saturated with recommendations
- Geographic-specific posts that don't align with the client's market
${customContext}
Respond with ONLY a JSON object: {"score": <float 0-1>, "note": "<1-2 sentence explanation>"}`;

  const userPrompt = `CLIENT: ${params.clientName}
DESCRIPTION: ${params.clientDescription}
KEYWORDS: ${params.clientKeywords.join(", ")}

THREAD:
Subreddit: r/${params.subreddit}
Title: ${params.threadTitle}
Body: ${params.threadBody.slice(0, 800)}
${params.topComments ? `Top Comments:\n${params.topComments.slice(0, 500)}` : ""}

Score this thread's relevance as a citation opportunity for this client.`;

  try {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { score: 0.5, note: "AI scoring returned no text", shouldKeep: true };
    }

    // Strip markdown code fences if present (```json ... ```)
    let jsonStr = text.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(jsonStr) as { score: number; note: string };
    return {
      score: Math.round(parsed.score * 100) / 100,
      note: parsed.note,
      shouldKeep: parsed.score >= params.threshold,
    };
  } catch (err) {
    console.error("AI scoring failed:", err);
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
  const dismissed = await prisma.opportunity.findMany({
    where: { status: "dismissed" },
    select: {
      title: true,
      subreddit: true,
      bodySnippet: true,
      dismissReason: true,
      relevanceScore: true,
      client: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  if (dismissed.length === 0) {
    return {
      totalDismissed: 0,
      patterns: [],
      summary: "No dismissed opportunities yet. Patterns will appear as you dismiss irrelevant results.",
      recommendations: [],
    };
  }

  const config = await getConfig();
  const client = new Anthropic({ apiKey: config.apiKey });

  const dismissedSummary = dismissed
    .slice(0, 50)
    .map((d, i) => `${i + 1}. [r/${d.subreddit}] "${d.title}" (score: ${d.relevanceScore?.toFixed(2) || "N/A"}, client: ${d.client?.name || "?"})${d.dismissReason ? ` — Reason: ${d.dismissReason}` : ""}`)
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
    messages: [{
      role: "user",
      content: `Analyze these ${dismissed.length} dismissed opportunities:\n\n${dismissedSummary}`,
    }],
  });

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    return {
      totalDismissed: dismissed.length,
      patterns: [],
      summary: "Unable to analyze patterns",
      recommendations: [],
    };
  }

  try {
    // Strip markdown code fences if present (```json ... ```)
    let jsonStr = text.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const parsed = JSON.parse(jsonStr) as {
      patterns: DismissalPattern[];
      summary: string;
      recommendations: string[];
    };
    return { totalDismissed: dismissed.length, ...parsed };
  } catch {
    return {
      totalDismissed: dismissed.length,
      patterns: [],
      summary: text.text,
      recommendations: [],
    };
  }
}
