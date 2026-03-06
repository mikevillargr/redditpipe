import Anthropic from "@anthropic-ai/sdk";
import { getValidModel } from "./models.js";
import { createPrismaClient } from "./prisma.js";

interface PileOnParams {
  primaryComment: string;
  threadTitle: string;
  threadBody: string;
  clientName: string;
  clientDescription: string;
  pileOnAccountPersonality: string | null;
  pileOnAccountWritingStyle: string | null;
}

/**
 * Generate a natural pile-on comment that reinforces the primary comment
 * Uses account personality and writing style to create authentic-sounding reinforcement
 */
export async function generatePileOnComment(params: PileOnParams): Promise<string> {
  const db = createPrismaClient();

  try {
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const apiKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error("No Anthropic API key configured");
    }

    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are generating a natural, authentic Reddit comment that reinforces a previous comment mentioning ${params.clientName}.

CRITICAL RULES:
1. NATURAL REINFORCEMENT: Sound like a real person who independently had a good experience
2. AVOID OBVIOUS PATTERNS: Don't just say "+1" or "I agree" - add personal context
3. DIFFERENT VOICE: Use a different writing style than the primary comment
4. SUBTLE: Don't over-praise or sound like a shill
5. AUTHENTIC: Include minor details that make it believable (e.g., "I used them last year for...")
6. CASUAL TONE: Use Reddit-style language - lowercase, contractions, natural flow
7. BRIEF: Keep it 1-3 sentences max - pile-ons should be concise

GOOD EXAMPLES:
- "I've used ${params.clientName} before and had a solid experience. Their customer service was responsive when I had questions."
- "Can vouch for ${params.clientName}. Used them for [specific use case] and it worked out well."
- "Just adding my 2 cents - ${params.clientName} is legit. Not perfect but definitely reliable."
- "yeah i second this, used them a few months back and no complaints"

BAD EXAMPLES:
- "+1 on ${params.clientName}!" (too short, obvious pile-on)
- "${params.clientName} is the best! Highly recommend!" (too enthusiastic, shill-like)
- "I agree with the above comment completely." (too obvious)
- "This is exactly right, ${params.clientName} is amazing!" (too eager)

${params.pileOnAccountPersonality ? `PERSONALITY: ${params.pileOnAccountPersonality}` : ""}
${params.pileOnAccountWritingStyle ? `WRITING STYLE: ${params.pileOnAccountWritingStyle}` : ""}

Generate a natural pile-on comment. Return ONLY the comment text, no explanation.`;

    const userPrompt = `THREAD: ${params.threadTitle}
BODY: ${params.threadBody.slice(0, 500)}

PRIMARY COMMENT (that mentioned ${params.clientName}):
${params.primaryComment}

Generate a natural pile-on comment that reinforces the primary comment without being obvious.`;

    const response = await Promise.race([
      client.messages.create({
        model: getValidModel(settings?.aiModelReplies),
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("AI pile-on generation timed out")), 30_000)
      ),
    ]);

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("AI returned no text");
    }

    return textBlock.text.trim();
  } finally {
    await db.$disconnect();
  }
}
