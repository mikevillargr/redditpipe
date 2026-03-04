export const VALID_MODELS = new Set([
  "claude-haiku-4-5-20251001",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-5-20250929",
  "claude-sonnet-4-6",
  "claude-opus-4-20250514",
  "claude-opus-4-6",
]);

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function getValidModel(stored?: string | null): string {
  if (stored && VALID_MODELS.has(stored)) return stored;
  return DEFAULT_MODEL;
}
