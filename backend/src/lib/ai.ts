import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "./prisma.js";
import { getValidModel } from "./models.js";

let cachedApiKey: string | null = null;
let cachedReplyModel: string | null = null;

async function getApiKey(): Promise<string> {
  if (cachedApiKey) return cachedApiKey;
  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  const key = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Anthropic API key not configured. Set it in Settings or ANTHROPIC_API_KEY env var.");
  cachedApiKey = key;
  cachedReplyModel = getValidModel((settings as Record<string, unknown>)?.aiModelReplies as string | undefined);
  return key;
}

function getReplyModel(): string {
  return cachedReplyModel || getValidModel();
}

function getClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey });
}

export function clearApiKeyCache(): void {
  cachedApiKey = null;
  cachedReplyModel = null;
}

interface GenerateReplyParams {
  threadTitle: string;
  threadBody: string;
  topComments: string;
  subreddit: string;
  clientName: string;
  clientUrl: string;
  clientDescription: string;
  clientMentionTerms: string;
  accountUsername?: string;
  accountPersonality?: string;
  accountStyleNotes?: string;
  accountSampleComments?: string;
}

export async function generateReplyDraft(params: GenerateReplyParams): Promise<string> {
  const apiKey = await getApiKey();
  const client = getClient(apiKey);

  let systemPrompt: string;

  if (params.accountUsername) {
    systemPrompt = `You are writing a Reddit reply as the user u/${params.accountUsername}.

ACCOUNT PERSONA:
${params.accountPersonality || "No persona notes available."}

STYLE NOTES:
${params.accountStyleNotes || "No style notes available."}

SAMPLE COMMENTS BY THIS USER (match this voice exactly):
${params.accountSampleComments || "No sample comments available."}

RULES:
- Match this user's writing style EXACTLY — sentence length, punctuation, casualness, vocabulary
- Be genuinely helpful — answer the question FIRST, then naturally work in the recommendation
- Mention ${params.clientName} using one of these terms naturally: ${params.clientMentionTerms}
- Do NOT make it the only recommendation — mention 1-2 other options
- Do NOT use marketing language or superlatives
- Do NOT start with "Hey!" or "Great question!"
- Keep it 2-4 short paragraphs max
- Sound like a real person sharing genuine experience

REDDIT MARKDOWN FORMAT (critical — output must be copy-pasteable into Reddit):
- Use Reddit markdown syntax: **bold**, *italic*, ~~strikethrough~~
- When mentioning any product, tool, or service, ALWAYS include a clickable link: [Product Name](https://example.com)
- For the client, link like: [${params.clientMentionTerms.split(',')[0].trim()}](${params.clientUrl})
- Use line breaks between paragraphs (double newline)
- Use bullet points with "- " when listing multiple options
- Do NOT use HTML tags — Reddit uses its own markdown

ANTI-DETECTION RULES (critical):
- No exclamation marks unless the persona uses them
- No perfect grammar if the persona doesn't write that way
- Don't mention the client first — answer question, then drop mention casually
- Keep replies SHORT (2-4 sentences typical for Reddit)
- Match persona's punctuation habits, emoji usage, Reddit slang (imo, tbh, fwiw)`;
  } else {
    systemPrompt = `You are writing a Reddit reply as a helpful community member.

RULES:
- Be genuinely helpful — answer the question FIRST, then naturally work in the recommendation
- Mention ${params.clientName} using one of these terms naturally: ${params.clientMentionTerms}
- Do NOT make it the only recommendation — mention 1-2 other options
- Do NOT use marketing language or superlatives
- Do NOT start with "Hey!" or "Great question!"
- Keep it 2-4 short paragraphs max
- Sound like a real person sharing genuine experience
- Keep replies SHORT (2-4 sentences typical for Reddit)
- Use casual Reddit tone (imo, tbh, fwiw)

REDDIT MARKDOWN FORMAT (critical — output must be copy-pasteable into Reddit):
- Use Reddit markdown syntax: **bold**, *italic*, ~~strikethrough~~
- When mentioning any product, tool, or service, ALWAYS include a clickable link: [Product Name](https://example.com)
- For the client, link like: [${params.clientMentionTerms.split(',')[0].trim()}](${params.clientUrl})
- Use line breaks between paragraphs (double newline)
- Use bullet points with "- " when listing multiple options
- Do NOT use HTML tags — Reddit uses its own markdown`;
  }

  const userPrompt = `THREAD CONTEXT:
Subreddit: r/${params.subreddit}
Title: ${params.threadTitle}
Thread body: ${params.threadBody}
Top comments: ${params.topComments}

CLIENT TO REFERENCE:
Name: ${params.clientName}
URL: ${params.clientUrl}
Description: ${params.clientDescription}
Mention terms (use the most natural one): ${params.clientMentionTerms}

Write a Reddit reply now.`;

  const response = await client.messages.create({
    model: getReplyModel(),
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  return textBlock.text;
}

type RewriteAction = "regenerate" | "shorter" | "casual" | "formal";

interface RewriteContext {
  accountPersonality?: string;
  clientName?: string;
  userPrompt?: string;
}

export async function rewriteReply(
  currentDraft: string,
  action: RewriteAction,
  context?: RewriteContext
): Promise<string> {
  const apiKey = await getApiKey();
  const client = getClient(apiKey);

  const actionPrompts: Record<RewriteAction, string> = {
    regenerate: `Completely rewrite this Reddit reply while keeping the same intent and client mention. Make it sound natural and different from the original.${context?.accountPersonality ? ` Match this persona: ${context.accountPersonality}` : ""}`,
    shorter: "Make this Reddit reply significantly shorter — condense to fewer sentences while keeping the key message and client mention.",
    casual: "Make this Reddit reply more casual and Reddit-native. Use more informal language, contractions, maybe some Reddit slang (imo, tbh, fwiw). Keep the client mention natural.",
    formal: "Make this Reddit reply more authoritative and well-structured. Use complete sentences and a more knowledgeable tone. Keep the client mention natural.",
  };

  const userInstruction = context?.userPrompt
    ? `\n\nADDITIONAL USER INSTRUCTIONS:\n${context.userPrompt}`
    : "";

  const response = await client.messages.create({
    model: getReplyModel(),
    max_tokens: 1024,
    system: "You are a Reddit reply editor. Return ONLY the rewritten reply text, nothing else. Always use Reddit markdown: [links](url), **bold**, *italic*, bullet points with \"- \". Include clickable URLs for any product/service mentioned.",
    messages: [{ role: "user", content: `${actionPrompts[action]}${userInstruction}\n\nCurrent reply:\n${currentDraft}` }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  return textBlock.text;
}

export async function testConnection(overrideApiKey?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiKey = overrideApiKey || await getApiKey();
    const client = getClient(apiKey);
    const response = await client.messages.create({
      model: getReplyModel(),
      max_tokens: 50,
      messages: [{ role: "user", content: "Say hello in one word." }],
    });
    return { success: response.content.length > 0 };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
