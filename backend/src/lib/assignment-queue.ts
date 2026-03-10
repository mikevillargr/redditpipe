import { createPrismaClient } from "./prisma.js";

interface AccountScore {
  accountId: string;
  score: number;
  reason: string;
}

/**
 * Assign an account to an opportunity using intelligent scoring
 * Considers citation ratio, post capacity, cooldowns, and interaction history
 */
export async function assignAccountToOpportunity(
  opportunityId: string,
  accountId?: string
): Promise<{ success: boolean; accountId?: string; error?: string }> {
  const db = createPrismaClient();

  try {
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      return { success: false, error: "Opportunity not found" };
    }

    // If account explicitly provided, assign directly
    if (accountId) {
      await db.opportunity.update({
        where: { id: opportunityId },
        data: { accountId },
      });
      return { success: true, accountId };
    }

    // Otherwise, use queue logic to find best account
    const bestAccount = await selectBestAccountForOpportunity(opportunity);

    if (!bestAccount) {
      return { success: false, error: "No suitable account available" };
    }

    await db.opportunity.update({
      where: { id: opportunityId },
      data: { accountId: bestAccount.accountId },
    });

    console.log(`[Queue] Assigned account ${bestAccount.accountId} to opportunity ${opportunityId} (score: ${bestAccount.score.toFixed(2)}, reason: ${bestAccount.reason})`);

    return { success: true, accountId: bestAccount.accountId };
  } finally {
    await db.$disconnect();
  }
}

/**
 * Select the best account for an opportunity based on multiple factors
 */
async function selectBestAccountForOpportunity(opportunity: {
  id: string;
  clientId: string;
  subreddit: string;
  threadId: string;
  opportunityType: string;
  parentOpportunityId: string | null;
}): Promise<AccountScore | null> {
  const db = createPrismaClient();

  try {
    // Get settings for cooldown
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    const cooldownDays = settings?.pileOnCooldownDays || 14;
    const cooldownDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);

    // Get all accounts assigned to this client
    const accounts = await db.redditAccount.findMany({
      where: {
        accountAssignments: { some: { clientId: opportunity.clientId } },
        status: "active",
      },
      select: {
        id: true,
        username: true,
        commentKarma: true,
        maxPostsPerDay: true,
        minHoursBetweenPosts: true,
        lastPostAt: true,
        postsTodayCount: true,
        citationPostsTotal: true,
        organicPostsTotal: true,
      },
    });

    if (accounts.length === 0) {
      return null;
    }

    // For pile-on opportunities, get parent account to avoid assignment
    let parentAccountId: string | null = null;
    if (opportunity.opportunityType === "pile_on" && opportunity.parentOpportunityId) {
      const parentOpp = await db.opportunity.findUnique({
        where: { id: opportunity.parentOpportunityId },
        select: { accountId: true },
      });
      parentAccountId = parentOpp?.accountId || null;
    }

    // Get recent interactions for pile-on opportunities
    let recentInteractions: { account1Id: string; account2Id: string }[] = [];
    if (opportunity.opportunityType === "pile_on" && parentAccountId) {
      recentInteractions = await db.accountInteractionLog.findMany({
        where: {
          OR: [
            { account1Id: parentAccountId },
            { account2Id: parentAccountId },
          ],
          createdAt: { gte: cooldownDate },
        },
        select: { account1Id: true, account2Id: true },
      });
    }

    // Score each account
    const scored: AccountScore[] = accounts
      .filter((account) => account.id !== parentAccountId) // Never assign parent account
      .map((account) => {
        let score = 0;
        const reasons: string[] = [];

        // 1. Citation ratio (35% weight) - prefer lower ratio
        const totalPosts = account.citationPostsTotal + account.organicPostsTotal;
        const citationRatio = totalPosts > 0 ? account.citationPostsTotal / totalPosts : 0;
        const citationScore = (1 - citationRatio) * 0.35;
        score += citationScore;
        reasons.push(`citation:${citationRatio.toFixed(2)}`);

        // 2. Post capacity (25% weight) - prefer accounts with capacity
        const capacityRatio = account.postsTodayCount / account.maxPostsPerDay;
        const capacityScore = (1 - capacityRatio) * 0.25;
        score += capacityScore;
        reasons.push(`capacity:${(1 - capacityRatio).toFixed(2)}`);

        // 3. Cooldown respected (20% weight)
        let cooldownScore = 0;
        if (account.lastPostAt) {
          const hoursSincePost = (Date.now() - account.lastPostAt.getTime()) / (1000 * 60 * 60);
          if (hoursSincePost >= account.minHoursBetweenPosts) {
            cooldownScore = 0.20;
            reasons.push("cooldown:ok");
          } else {
            reasons.push("cooldown:pending");
          }
        } else {
          cooldownScore = 0.20;
          reasons.push("cooldown:never");
        }
        score += cooldownScore;

        // 4. Interaction history (20% weight) - for pile-ons only
        if (opportunity.opportunityType === "pile_on") {
          const interactionCount = recentInteractions.filter(
            (i) => i.account1Id === account.id || i.account2Id === account.id
          ).length;
          const interactionScore = interactionCount === 0 ? 0.20 : Math.max(0, 0.20 - interactionCount * 0.05);
          score += interactionScore;
          reasons.push(`interactions:${interactionCount}`);
        } else {
          score += 0.20; // Full score for non-pile-on
        }

        return {
          accountId: account.id,
          score,
          reason: reasons.join(", "),
        };
      });

    if (scored.length === 0) {
      return null;
    }

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    return scored[0];
  } finally {
    await db.$disconnect();
  }
}

/**
 * Process the assignment queue - assign accounts to all unassigned opportunities
 * Called when new accounts are added or updated
 */
export async function processAssignmentQueue(): Promise<{
  assigned: number;
  failed: number;
  errors: string[];
}> {
  const db = createPrismaClient();

  try {
    // Get all unassigned opportunities
    const unassignedOpps = await db.opportunity.findMany({
      where: {
        accountId: null,
        status: "new",
      },
      orderBy: [
        { createdAt: "asc" }, // Older opportunities first
        { relevanceScore: "desc" }, // Higher relevance first
      ],
    });

    console.log(`[Queue] Processing ${unassignedOpps.length} unassigned opportunities`);

    let assigned = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const opp of unassignedOpps) {
      const result = await assignAccountToOpportunity(opp.id);
      if (result.success) {
        assigned++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${opp.id}: ${result.error}`);
        }
      }
    }

    console.log(`[Queue] Complete: ${assigned} assigned, ${failed} failed`);

    return { assigned, failed, errors };
  } finally {
    await db.$disconnect();
  }
}
