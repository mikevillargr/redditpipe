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

    const systemPrompt = `You are generating a natural Reddit reply comment that agrees with and reinforces a previous comment mentioning ${params.clientName}.

CONTEXT: You are writing a REPLY to someone else's comment (not a top-level comment). This should read like you're responding directly to them.

CRITICAL RULES:
1. REPLY FORMAT: Write as if responding to the person who posted the original comment
2. NATURAL AGREEMENT: Sound like a real person who independently had a similar experience
3. AVOID OBVIOUS PATTERNS: Don't just say "+1" or "I agree" - add personal context
4. DIFFERENT VOICE: Use a different writing style than the original comment
5. SUBTLE: Don't over-praise or sound like a shill
6. AUTHENTIC: Include minor details that make it believable (e.g., "I used them last year for...")
7. CASUAL TONE: Use Reddit-style language - lowercase, contractions, natural flow
8. BRIEF: Keep it 1-3 sentences max - pile-ons should be concise

GOOD EXAMPLES (as replies):
- "Same experience here. I've used ${params.clientName} before and their customer service was responsive when I had questions."
- "Can vouch for this. Used them for [specific use case] and it worked out well."
- "Yeah this is accurate. ${params.clientName} is legit, not perfect but definitely reliable."
- "yep, used them a few months back and no complaints. solid recommendation"

BAD EXAMPLES:
- "+1 on ${params.clientName}!" (too short, obvious pile-on)
- "${params.clientName} is the best! Highly recommend!" (not a reply, too enthusiastic)
- "I agree with the above comment completely." (too obvious)
- "This is exactly right!" (too eager, no substance)

${params.pileOnAccountPersonality ? `PERSONALITY: ${params.pileOnAccountPersonality}` : ""}
${params.pileOnAccountWritingStyle ? `WRITING STYLE: ${params.pileOnAccountWritingStyle}` : ""}

Generate a natural reply comment that agrees with the original comment. Return ONLY the comment text, no explanation.`;

    const userPrompt = `THREAD CONTEXT: "${params.threadTitle}"
${params.threadBody.slice(0, 300)}

ORIGINAL COMMENT YOU'RE REPLYING TO (that mentioned ${params.clientName}):
"${params.primaryComment}"

Generate a natural reply comment that agrees with and reinforces the original comment. This should read like you're responding directly to the person who posted it, sharing your own similar experience with ${params.clientName}.`;

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
