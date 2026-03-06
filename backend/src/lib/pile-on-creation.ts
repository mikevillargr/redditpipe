import { createPrismaClient } from "./prisma.js";

/**
 * Automatically create pile-on opportunities when a primary comment is verified as published
 * Creates N pile-on opportunities (N = pileOnMaxPerPrimary setting)
 * Each pile-on is a full Opportunity record with opportunityType: "pile_on"
 */
export async function createPileOnOpportunities(
  primaryOpportunityId: string
): Promise<{ created: number; opportunities: string[] }> {
  const db = createPrismaClient();

  try {
    // Get settings
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    
    // Check if auto-creation is enabled
    if (!settings?.pileOnAutoCreate || !settings?.pileOnEnabled) {
      return { created: 0, opportunities: [] };
    }

    // Get the primary opportunity
    const primaryOpp = await db.opportunity.findUnique({
      where: { id: primaryOpportunityId },
      include: {
        client: true,
        account: true,
      },
    });

    if (!primaryOpp) {
      throw new Error("Primary opportunity not found");
    }

    if (primaryOpp.opportunityType !== "primary") {
      throw new Error("Can only create pile-ons from primary opportunities");
    }

    if (primaryOpp.status !== "published") {
      throw new Error("Can only create pile-ons from published opportunities");
    }

    // Check how many pile-ons already exist for this primary
    const existingPileOns = await db.opportunity.count({
      where: {
        parentOpportunityId: primaryOpportunityId,
        opportunityType: "pile_on",
      },
    });

    const maxPileOns = settings.pileOnMaxPerPrimary || 2;
    const toCreate = Math.max(0, maxPileOns - existingPileOns);

    if (toCreate === 0) {
      console.log(`[PileOn] Max pile-ons (${maxPileOns}) already exist for opportunity ${primaryOpportunityId}`);
      return { created: 0, opportunities: [] };
    }

    // Calculate eligible time (when pile-on can be published)
    const minDelayHours = settings.pileOnDelayMinHours || 2;
    const pileOnEligibleAt = new Date(Date.now() + minDelayHours * 60 * 60 * 1000);

    // Create pile-on opportunities
    const createdIds: string[] = [];
    
    for (let i = 0; i < toCreate; i++) {
      const pileOn = await db.opportunity.create({
        data: {
          clientId: primaryOpp.clientId,
          accountId: null, // Will be assigned by queue system
          threadId: primaryOpp.threadId,
          threadUrl: primaryOpp.threadUrl,
          subreddit: primaryOpp.subreddit,
          title: primaryOpp.title,
          bodySnippet: primaryOpp.bodySnippet,
          topComments: primaryOpp.topComments,
          score: primaryOpp.score,
          commentCount: primaryOpp.commentCount,
          threadAge: primaryOpp.threadAge,
          threadCreatedAt: primaryOpp.threadCreatedAt,
          relevanceScore: primaryOpp.relevanceScore,
          aiDraftReply: null, // Deferred - generated when user reviews
          status: "new",
          discoveredVia: "pile_on_auto",
          opportunityType: "pile_on",
          parentOpportunityId: primaryOpportunityId,
          pileOnEligibleAt,
        },
      });

      createdIds.push(pileOn.id);
    }

    console.log(`[PileOn] Created ${createdIds.length} pile-on opportunities for ${primaryOpportunityId}`);
    
    return { created: createdIds.length, opportunities: createdIds };
  } finally {
    await db.$disconnect();
  }
}

/**
 * Manually create a pile-on opportunity (triggered by "Pile On" button)
 * Similar to auto-creation but bypasses the max limit check
 */
export async function createManualPileOn(
  primaryOpportunityId: string
): Promise<{ success: boolean; opportunityId?: string; error?: string }> {
  const db = createPrismaClient();

  try {
    // Get settings
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    
    if (!settings?.pileOnEnabled) {
      return { success: false, error: "Pile-on feature is not enabled" };
    }

    // Get the primary opportunity
    const primaryOpp = await db.opportunity.findUnique({
      where: { id: primaryOpportunityId },
    });

    if (!primaryOpp) {
      return { success: false, error: "Primary opportunity not found" };
    }

    if (primaryOpp.opportunityType !== "primary") {
      return { success: false, error: "Can only create pile-ons from primary opportunities" };
    }

    if (primaryOpp.status !== "published") {
      return { success: false, error: "Can only create pile-ons from published opportunities" };
    }

    // Calculate eligible time
    const minDelayHours = settings.pileOnDelayMinHours || 2;
    const pileOnEligibleAt = new Date(Date.now() + minDelayHours * 60 * 60 * 1000);

    // Create pile-on opportunity
    const pileOn = await db.opportunity.create({
      data: {
        clientId: primaryOpp.clientId,
        accountId: null,
        threadId: primaryOpp.threadId,
        threadUrl: primaryOpp.threadUrl,
        subreddit: primaryOpp.subreddit,
        title: primaryOpp.title,
        bodySnippet: primaryOpp.bodySnippet,
        topComments: primaryOpp.topComments,
        score: primaryOpp.score,
        commentCount: primaryOpp.commentCount,
        threadAge: primaryOpp.threadAge,
        threadCreatedAt: primaryOpp.threadCreatedAt,
        relevanceScore: primaryOpp.relevanceScore,
        aiDraftReply: null,
        status: "new",
        discoveredVia: "pile_on_manual",
        opportunityType: "pile_on",
        parentOpportunityId: primaryOpportunityId,
        pileOnEligibleAt,
      },
    });

    console.log(`[PileOn] Manually created pile-on opportunity ${pileOn.id} for ${primaryOpportunityId}`);
    
    return { success: true, opportunityId: pileOn.id };
  } catch (error) {
    console.error("[PileOn] Manual creation failed:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create pile-on" 
    };
  } finally {
    await db.$disconnect();
  }
}
