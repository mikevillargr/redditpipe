interface AccountForMatching {
  id: string;
  username: string;
  status: string;
  activeSubreddits: string | null;
  commentKarma: number | null;
  maxPostsPerDay: number;
  minHoursBetweenPosts: number;
  lastPostAt: Date | null;
  postsTodayCount: number;
  accountAssignments: {
    clientId: string;
  }[];
}

interface MatchingParams {
  subreddit: string;
  clientId: string;
  accounts: AccountForMatching[];
}

interface MatchResult {
  account: AccountForMatching;
  score: number;
}

export function findBestAccount(params: MatchingParams): AccountForMatching | null {
  const { subreddit, clientId, accounts } = params;

  const eligibleAccounts = accounts.filter(
    (acc) =>
      acc.status === "active" &&
      acc.accountAssignments.some((a) => a.clientId === clientId)
  );

  if (eligibleAccounts.length === 0) return null;

  const scored: MatchResult[] = eligibleAccounts.map((account) => {
    // 1. Subreddit Overlap (weight: 0.4)
    let subredditOverlap = 0;
    if (account.activeSubreddits) {
      try {
        const subs: string[] = JSON.parse(account.activeSubreddits);
        subredditOverlap = subs.some(
          (s) => s.toLowerCase() === subreddit.toLowerCase()
        )
          ? 1.0
          : 0.0;
      } catch {
        subredditOverlap = 0;
      }
    }

    // 2. Availability (weight: 0.3)
    let availability = 0;
    const underDailyLimit = account.postsTodayCount < account.maxPostsPerDay;
    let pastCooldown = true;
    if (account.lastPostAt) {
      const hoursSinceLastPost =
        (Date.now() - account.lastPostAt.getTime()) / (1000 * 60 * 60);
      pastCooldown = hoursSinceLastPost >= account.minHoursBetweenPosts;
    }
    availability = underDailyLimit && pastCooldown ? 1.0 : 0.0;

    // 3. Karma (weight: 0.2)
    const karma = account.commentKarma || 0;
    let karmaScore: number;
    if (karma > 1000) {
      karmaScore = 1.0;
    } else if (karma > 100) {
      karmaScore = 0.5;
    } else {
      karmaScore = 0.2;
    }

    // 4. Topic Breadth (weight: 0.1)
    let topicBreadth = 0;
    if (account.activeSubreddits) {
      try {
        const subs: string[] = JSON.parse(account.activeSubreddits);
        topicBreadth = Math.min(subs.length / 10, 1.0);
      } catch {
        topicBreadth = 0;
      }
    }

    const score =
      subredditOverlap * 0.4 +
      availability * 0.3 +
      karmaScore * 0.2 +
      topicBreadth * 0.1;

    return { account, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Only return if the best account has a positive availability score
  const best = scored[0];
  if (!best || best.score === 0) return null;

  return best.account;
}
