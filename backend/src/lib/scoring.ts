// Original scoring logic (from first release) — simple exact-phrase keyword matching
// AI scoring is the real quality filter; heuristic is just a fallback

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

  // 1. Keyword Match (weight: 0.4) — best-match scoring (not averaged across all keywords)
  // A thread matching even 1 keyword well should score high. Averaging penalizes clients
  // with many keywords because most threads won't match ALL of them.
  const text = `${threadTitle} ${threadBody}`.toLowerCase();
  let bestKeywordScore = 0;
  let matchedKeywords = 0;
  for (const kw of clientKeywords) {
    const kwLower = kw.toLowerCase().trim();
    let kwScore = 0;
    if (text.includes(kwLower)) {
      kwScore = 1.0; // exact phrase match
    } else {
      // Partial: count how many significant words from the keyword appear
      const words = kwLower.split(/\s+/).filter((w) => w.length > 2);
      if (words.length > 0) {
        const matched = words.filter((w) => text.includes(w)).length;
        kwScore = matched / words.length * 0.4; // partial match worth up to 40%
      }
    }
    if (kwScore > 0.3) matchedKeywords++;
    bestKeywordScore = Math.max(bestKeywordScore, kwScore);
  }
  // Bonus for matching multiple keywords (up to 20% boost)
  const multiMatchBonus = Math.min(matchedKeywords * 0.1, 0.2);
  const keywordScore = Math.min(bestKeywordScore + multiMatchBonus, 1.0);

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
