import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import { getModelProvider, type AIProvider } from "./models.js";
import { prisma } from "./prisma.js";

interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIResponse {
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

interface AIClientConfig {
  model: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

let cachedAnthropicKey: string | null = null;
let cachedZaiKey: string | null = null;

async function getApiKeys(): Promise<{ anthropic: string | null; zai: string | null }> {
  if (cachedAnthropicKey && cachedZaiKey) {
    return { anthropic: cachedAnthropicKey, zai: cachedZaiKey };
  }

  const settings = await prisma.settings.findUnique({ where: { id: "singleton" } });
  cachedAnthropicKey = settings?.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
  cachedZaiKey = settings?.zaiApiKey || process.env.ZAI_API_KEY || null;

  return { anthropic: cachedAnthropicKey, zai: cachedZaiKey };
}

export function clearAIClientCache(): void {
  cachedAnthropicKey = null;
  cachedZaiKey = null;
}

/**
 * Unified AI client that supports both Anthropic Claude and Z.ai GLM models
 */
export async function callAI(
  messages: AIMessage[],
  config: AIClientConfig
): Promise<AIResponse> {
  const provider = getModelProvider(config.model);
  const keys = await getApiKeys();

  if (provider === "anthropic") {
    return callAnthropic(messages, config, keys.anthropic);
  } else {
    return callZai(messages, config, keys.zai);
  }
}

async function callAnthropic(
  messages: AIMessage[],
  config: AIClientConfig,
  apiKey: string | null
): Promise<AIResponse> {
  if (!apiKey) {
    throw new Error("Anthropic API key not configured");
  }

  const client = new Anthropic({ apiKey });

  // Separate system message from conversation messages
  const systemMessage = messages.find(m => m.role === "system");
  const conversationMessages = messages.filter(m => m.role !== "system");

  // Build system prompt
  let systemPrompt = config.systemPrompt || systemMessage?.content || "";

  const response = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens || 4096,
    temperature: config.temperature,
    system: systemPrompt,
    messages: conversationMessages.map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const textContent = response.content.find(c => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in Anthropic response");
  }

  return {
    content: textContent.text,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

function generateZaiToken(apiKey: string, expSeconds: number = 3600): string {
  try {
    const [id, secret] = apiKey.split(".");
    if (!id || !secret) {
      throw new Error("Invalid Z.ai API key format. Expected format: id.secret");
    }
    
    // Z.ai requires timestamps in milliseconds
    const nowMs = Date.now();
    const payload = {
      api_key: id,
      exp: nowMs + expSeconds * 1000,
      timestamp: nowMs,
    };
    
    // Z.ai requires sign_type in JWT header
    const token = jwt.sign(payload, secret, {
      algorithm: "HS256",
      header: {
        alg: "HS256",
        sign_type: "SIGN",
      } as any, // TypeScript doesn't know about custom headers
    });
    
    return token;
  } catch (error) {
    throw new Error(`Failed to generate Z.ai token: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function callZai(
  messages: AIMessage[],
  config: AIClientConfig,
  apiKey: string | null
): Promise<AIResponse> {
  if (!apiKey) {
    throw new Error("Z.ai API key not configured");
  }

  const token = generateZaiToken(apiKey);
  const client = new OpenAI({
    apiKey: token,
    baseURL: "https://api.z.ai/api/paas/v4/",
  });

  // Convert messages - OpenAI format supports system messages directly
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  // Add system prompt if provided and no system message exists
  if (config.systemPrompt && !messages.some(m => m.role === "system")) {
    formattedMessages.unshift({
      role: "system",
      content: config.systemPrompt,
    });
  }

  const response = await client.chat.completions.create({
    model: config.model,
    messages: formattedMessages,
    max_tokens: config.maxTokens || 4096,
    temperature: config.temperature,
  });

  // Z.ai GLM models return both reasoning_content and content
  // We want the actual content, not the reasoning
  const message = response.choices[0]?.message;
  const content = message?.content || message?.reasoning_content;
  
  if (!content) {
    console.error("[Z.ai] No content in response:", JSON.stringify(message));
    throw new Error("No content in Z.ai response");
  }

  return {
    content,
    usage: response.usage ? {
      inputTokens: response.usage.prompt_tokens,
      outputTokens: response.usage.completion_tokens,
    } : undefined,
  };
}

/**
 * Helper to create a simple single-turn AI call
 */
export async function callAISimple(
  userPrompt: string,
  model: string,
  systemPrompt?: string,
  maxTokens?: number
): Promise<string> {
  const response = await callAI(
    [{ role: "user", content: userPrompt }],
    { model, maxTokens, systemPrompt }
  );
  return response.content;
}

export { generateZaiToken };
