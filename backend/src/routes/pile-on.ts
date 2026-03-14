import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
import { selectPileOnAccount } from "../lib/pile-on-matching.js";
import { generatePileOnComment } from "../lib/ai-pile-on.js";
import { postComment } from "../lib/reddit.js";
import { createManualPileOn } from "../lib/pile-on-creation.js";

const app = new Hono();

/**
 * POST /api/opportunities/:id/pile-on/generate
 * Generate a +1/agreement response for a published opportunity
 * Creates a new Opportunity record with opportunityType='pile_on'
 */
app.post("/:id/pile-on/generate", async (c) => {
  const parentOpportunityId = c.req.param("id");
  const body = await c.req.json();
  const { accountId } = body;
  
  if (!accountId) {
    return c.json({ error: "Account ID required" }, 400);
  }

  const db = createPrismaClient();

  try {
    // Get the parent opportunity with its published reply
    const parentOpportunity = await db.opportunity.findUnique({
      where: { id: parentOpportunityId },
      include: {
        client: true,
        account: true,
      },
    });

    if (!parentOpportunity) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    if (parentOpportunity.status !== "published") {
      return c.json({ error: "Can only pile-on to published opportunities" }, 400);
    }

    if (!parentOpportunity.aiDraftReply) {
      return c.json({ error: "No reply found for this opportunity" }, 400);
    }

    // Prevent pile-on from same account
    if (parentOpportunity.accountId === accountId) {
      return c.json({ error: "Cannot pile-on to your own comment" }, 400);
    }

    // Get the account that will post the pile-on
    const account = await db.redditAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Check if pile-on opportunity already exists for this account
    const existing = await db.opportunity.findFirst({
      where: {
        parentOpportunityId: parentOpportunityId,
        accountId: accountId,
        opportunityType: "pile_on",
      },
    });

    if (existing) {
      // Return existing pile-on opportunity
      return c.json({
        success: true,
        draftReply: existing.aiDraftReply,
        pileOnId: existing.id,
        opportunityId: existing.id,
        threadUrl: existing.threadUrl,
        status: existing.status,
      });
    }

    // Generate a +1/agreement response using AI
    const draftReply = await generatePileOnComment({
      primaryComment: parentOpportunity.aiDraftReply,
      threadTitle: parentOpportunity.title,
      threadBody: parentOpportunity.bodySnippet || "",
      clientName: parentOpportunity.client.name,
      clientDescription: parentOpportunity.client.description || "",
      pileOnAccountPersonality: account.personalitySummary,
      pileOnAccountWritingStyle: account.writingStyleNotes,
    });

    // Create pile-on as a real Opportunity record
    const pileOnOpportunity = await db.opportunity.create({
      data: {
        clientId: parentOpportunity.clientId,
        accountId: accountId,
        threadId: parentOpportunity.threadId,
        threadUrl: parentOpportunity.threadUrl,
        subreddit: parentOpportunity.subreddit,
        title: parentOpportunity.title,
        bodySnippet: parentOpportunity.bodySnippet,
        topComments: parentOpportunity.topComments,
        score: parentOpportunity.score,
        commentCount: parentOpportunity.commentCount,
        threadAge: parentOpportunity.threadAge,
        threadCreatedAt: parentOpportunity.threadCreatedAt,
        aiDraftReply: draftReply,
        status: "new",
        opportunityType: "pile_on",
        parentOpportunityId: parentOpportunityId,
        discoveredVia: "pile_on",
      },
    });

    return c.json({
      success: true,
      draftReply,
      pileOnId: pileOnOpportunity.id,
      opportunityId: pileOnOpportunity.id,
      threadUrl: pileOnOpportunity.threadUrl,
      status: "new",
    });
  } catch (error) {
    console.error("Error generating pile-on:", error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to generate pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * PUT /api/opportunities/:id/pile-on/:pileOnId
 * Update pile-on draft text
 */
app.put("/:id/pile-on/:pileOnId", async (c) => {
  const pileOnId = c.req.param("pileOnId");
  const body = await c.req.json();
  const { draftReply } = body;
  
  const db = createPrismaClient();

  try {
    const pileOn = await db.pileOnComment.update({
      where: { id: pileOnId },
      data: { aiDraftReply: draftReply },
    });

    return c.json({ success: true, pileOn });
  } catch (error) {
    console.error("Error updating pile-on:", error);
    return c.json({ error: "Failed to update pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * DELETE /api/opportunities/:id/pile-on/:pileOnId
 * Dismiss/delete a pile-on opportunity
 */
app.delete("/:id/pile-on/:pileOnId", async (c) => {
  const pileOnId = c.req.param("pileOnId");
  const db = createPrismaClient();

  try {
    // Delete the pile-on opportunity
    await db.opportunity.delete({
      where: { id: pileOnId },
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting pile-on:", error);
    return c.json({ error: "Failed to delete pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * POST /api/opportunities/:id/pile-on/:pileOnId/publish
 * Mark pile-on opportunity as published (manual verification workflow)
 */
app.post("/:id/pile-on/:pileOnId/publish", async (c) => {
  const parentOpportunityId = c.req.param("id");
  const pileOnId = c.req.param("pileOnId");
  const body = await c.req.json();
  const { permalinkUrl } = body;
  
  const db = createPrismaClient();

  try {
    // Get pile-on opportunity
    const pileOnOpportunity = await db.opportunity.findUnique({
      where: { id: pileOnId },
      include: {
        parentOpportunity: {
          include: {
            account: true,
          },
        },
        account: true,
      },
    });

    if (!pileOnOpportunity || pileOnOpportunity.parentOpportunityId !== parentOpportunityId) {
      return c.json({ error: "Pile-on opportunity not found" }, 404);
    }

    if (pileOnOpportunity.status === "published") {
      return c.json({ error: "Pile-on already published" }, 400);
    }

    // Manual workflow: user provides permalink after posting manually
    // Update pile-on opportunity status to published
    await db.opportunity.update({
      where: { id: pileOnId },
      data: {
        status: "published",
        permalinkUrl: permalinkUrl || "",
        publishedAt: new Date(),
      },
    });

    // Log interaction between parent account and pile-on account
    if (pileOnOpportunity.parentOpportunity?.accountId && pileOnOpportunity.accountId) {
      await db.accountInteractionLog.create({
        data: {
          account1Id: pileOnOpportunity.parentOpportunity.accountId,
          account2Id: pileOnOpportunity.accountId,
          interactionType: "pile_on",
          threadId: pileOnOpportunity.threadId,
          subreddit: pileOnOpportunity.subreddit,
        },
      });
    }

    return c.json({
      success: true,
      permalinkUrl,
    });
  } catch (error) {
    console.error("Error publishing pile-on:", error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to publish pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * GET /api/opportunities/:id/pile-on
 * Get all pile-on comments for an opportunity
 */
app.get("/:id/pile-on", async (c) => {
  const opportunityId = c.req.param("id");
  const db = createPrismaClient();

  try {
    const pileOns = await db.pileOnComment.findMany({
      where: { opportunityId },
      include: {
        pileOnAccount: {
          select: {
            id: true,
            username: true,
            commentKarma: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json(pileOns);
  } catch (error) {
    console.error("Error fetching pile-ons:", error);
    return c.json({ error: "Failed to fetch pile-ons" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * PUT /api/opportunities/:id/pile-on/:pileOnId
 * Update pile-on comment draft
 */
app.put("/:id/pile-on/:pileOnId", async (c) => {
  const opportunityId = c.req.param("id");
  const pileOnId = c.req.param("pileOnId");
  const body = await c.req.json();
  const db = createPrismaClient();

  try {
    const pileOn = await db.pileOnComment.findUnique({
      where: { id: pileOnId },
    });

    if (!pileOn || pileOn.opportunityId !== opportunityId) {
      return c.json({ error: "Pile-on comment not found" }, 404);
    }

    if (pileOn.status === "posted") {
      return c.json({ error: "Cannot edit posted pile-on" }, 400);
    }

    const updated = await db.pileOnComment.update({
      where: { id: pileOnId },
      data: {
        aiDraftReply: body.aiDraftReply || pileOn.aiDraftReply,
      },
    });

    return c.json(updated);
  } catch (error) {
    console.error("Error updating pile-on:", error);
    return c.json({ error: "Failed to update pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

export default app;
