import { createPrismaClient } from "./prisma.js";

interface AccountScore {
  account: {
    id: string;
    username: string;
    commentKarma: number | null;
    personalitySummary: string | null;
    writingStyleNotes: string | null;
  };
  score: number;
}

/**
 * Select the best secondary account for a pile-on comment
 * Minimizes suspicious interaction patterns by:
 * - Avoiding accounts that recently interacted with the primary account
 * - Preferring accounts with higher karma (more credible)
 * - Ensuring diversity in account pairing
 */
export async function selectPileOnAccount(
  opportunityId: string,
  primaryAccountId: string,
  clientId: string
): Promise<{ id: string; username: string; commentKarma: number | null; personalitySummary: string | null; writingStyleNotes: string | null } | null> {
  const db = createPrismaClient();

  try {
    // Get settings for cooldown period
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const cooldownDays = settings?.pileOnCooldownDays ?? 14;
    const cooldownDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

    // 1. Get all accounts assigned to this client (excluding primary)
    const candidateAccounts = await db.redditAccount.findMany({
      where: {
        accountAssignments: { some: { clientId } },
        id: { not: primaryAccountId },
        status: "active",
      },
      select: {
        id: true,
        username: true,
        commentKarma: true,
        personalitySummary: true,
        writingStyleNotes: true,
      },
    });

    if (candidateAccounts.length === 0) {
      return null;
    }

    // 2. Get recent interactions within cooldown period
    const recentInteractions = await db.accountInteractionLog.findMany({
      where: {
        OR: [
          { account1Id: primaryAccountId },
          { account2Id: primaryAccountId },
        ],
        createdAt: { gte: cooldownDate },
      },
    });

    // 3. Get existing pile-ons for this opportunity
    const existingPileOns = await db.pileOnComment.findMany({
      where: { opportunityId },
      select: { pileOnAccountId: true },
    });
    const usedAccountIds = new Set(existingPileOns.map((p) => p.pileOnAccountId));

    // 4. Score candidates (lower = better)
    const scored: AccountScore[] = candidateAccounts
      .filter((account) => !usedAccountIds.has(account.id)) // Exclude already used accounts
      .map((account) => {
        // Count interactions with primary account
        const interactionCount = recentInteractions.filter(
          (i) => i.account1Id === account.id || i.account2Id === account.id
        ).length;

        // Prefer accounts with:
        // - Fewer recent interactions with primary account (most important)
        // - Higher karma (more credible)
        const score =
          interactionCount * 100 + // Heavy penalty for recent interactions
          (1000 - (account.commentKarma || 0)) / 100; // Minor penalty for low karma

        return { account, score };
      });

    if (scored.length === 0) {
      return null;
    }

    // 5. Return best candidate (lowest score)
    scored.sort((a, b) => a.score - b.score);
    return scored[0].account;
  } finally {
    await db.$disconnect();
  }
}
