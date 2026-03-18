// Anthropic Claude models
export const ANTHROPIC_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  "claude-sonnet-4-6",
  "claude-opus-4-20250514",
  "claude-opus-4-6",
]);

// Z.ai GLM models
export const ZAI_MODELS = new Set([
  "glm-5",
  "glm-4.7",
  "glm-4.6",
  "glm-4.5",
  "glm-4.5-air",
  "glm-4.5-flash",
]);

export const VALID_MODELS = new Set([...ANTHROPIC_MODELS, ...ZAI_MODELS]);

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export type AIProvider = "anthropic" | "zai";

export function getModelProvider(model: string): AIProvider {
  if (ZAI_MODELS.has(model)) return "zai";
  return "anthropic";
}

export function getValidModel(stored?: string | null): string {
  if (stored && VALID_MODELS.has(stored)) return stored;
  return DEFAULT_MODEL;
}
