interface ScoringParams {
  threadTitle: string;
  threadBody: string;
  clientKeywords: string[];
  threadScore: number;
  commentCount: number;
  threadCreatedAt: Date;
  threadMaxAgeDays?: number;
}

const INTENT_KEYWORDS = [
  "recommend",
  "looking for",
  "best",
  "anyone tried",
  "suggestions",
  "advice",
  "help me find",
  "what do you use",
  "alternatives",
  "which one",
  "should i",
  "worth it",
  "experience with",
  "thoughts on",
  "opinion on",
  "review",
];

export function computeRelevanceScore(params: ScoringParams): number {
  const {
    threadTitle,
    threadBody,
    clientKeywords,
    threadScore,
    commentCount,
    threadCreatedAt,
    threadMaxAgeDays = 2,
  } = params;

  // 1. Keyword Match (weight: 0.4)
  const text = `${threadTitle} ${threadBody}`.toLowerCase();
  const matchedKeywords = clientKeywords.filter((kw) =>
    text.includes(kw.toLowerCase().trim())
  );
  // HARD GATE: must match at least 1 keyword or score is 0
  if (matchedKeywords.length === 0) return 0;
  const keywordScore =
    clientKeywords.length > 0 ? matchedKeywords.length / clientKeywords.length : 0;

  // 2. Recency (weight: 0.2)
  const ageMs = Date.now() - threadCreatedAt.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const maxAgeHours = threadMaxAgeDays * 24;
  let recencyScore: number;
  if (ageHours < 4) {
    recencyScore = 1.0;
  } else if (ageHours >= maxAgeHours) {
    recencyScore = 0.0;
  } else {
    recencyScore = 1.0 - (ageHours - 4) / (maxAgeHours - 4);
  }

  // 3. Engagement (weight: 0.2)
  const engagementScore = Math.min(
    Math.log(1 + threadScore + commentCount) / Math.log(501),
    1.0
  );

  // 4. Intent Match (weight: 0.2)
  const hasIntent = INTENT_KEYWORDS.some((intent) => text.includes(intent));
  const intentScore = hasIntent ? 1.0 : 0.3;

  // Weighted sum
  const finalScore =
    keywordScore * 0.4 +
    recencyScore * 0.2 +
    engagementScore * 0.2 +
    intentScore * 0.2;

  return Math.round(finalScore * 100) / 100;
}
