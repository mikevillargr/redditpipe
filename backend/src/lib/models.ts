export const VALID_MODELS = new Set([
  "claude-sonnet-4-20250514",
  "claude-3-5-haiku-20241022",
  "claude-sonnet-4-5-20250929",
  "claude-opus-4-20250115",
]);

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";

export function getValidModel(stored?: string | null): string {
  if (stored && VALID_MODELS.has(stored)) return stored;
  return DEFAULT_MODEL;
}
