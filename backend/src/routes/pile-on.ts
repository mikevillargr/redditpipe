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
 */
app.post("/:id/pile-on/generate", async (c) => {
  const opportunityId = c.req.param("id");
  const body = await c.req.json();
  const { accountId } = body;
  
  if (!accountId) {
    return c.json({ error: "Account ID required" }, 400);
  }

  const db = createPrismaClient();

  try {
    // Get the opportunity with its published reply
    const opportunity = await db.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        client: true,
        account: true,
      },
    });

    if (!opportunity) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    if (opportunity.status !== "published") {
      return c.json({ error: "Can only pile-on to published opportunities" }, 400);
    }

    if (!opportunity.aiDraftReply) {
      return c.json({ error: "No reply found for this opportunity" }, 400);
    }

    // Get the account that will post the pile-on
    const account = await db.redditAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Generate a +1/agreement response using AI
    const draftReply = await generatePileOnComment({
      primaryComment: opportunity.aiDraftReply,
      threadTitle: opportunity.title,
      threadBody: opportunity.bodySnippet || "",
      clientName: opportunity.client.name,
      clientDescription: opportunity.client.description || "",
      pileOnAccountPersonality: account.personalitySummary,
      pileOnAccountWritingStyle: account.writingStyleNotes,
    });

    return c.json({
      success: true,
      draftReply,
    });
  } catch (error) {
    console.error("Error generating pile-on:", error);
    return c.json({ error: error instanceof Error ? error.message : "Failed to generate pile-on" }, 500);
  } finally {
    await db.$disconnect();
  }
});

/**
 * POST /api/opportunities/:id/pile-on/:pileOnId/publish
 * Publish a pile-on comment to Reddit
 */
app.post("/:id/pile-on/:pileOnId/publish", async (c) => {
  const opportunityId = c.req.param("id");
  const pileOnId = c.req.param("pileOnId");
  const db = createPrismaClient();

  try {
    // Get pile-on comment
    const pileOn = await db.pileOnComment.findUnique({
      where: { id: pileOnId },
      include: {
        opportunity: {
          include: {
            account: true,
          },
        },
        pileOnAccount: true,
      },
    });

    if (!pileOn || pileOn.opportunityId !== opportunityId) {
      return c.json({ error: "Pile-on comment not found" }, 404);
    }

    if (pileOn.status === "posted") {
      return c.json({ error: "Pile-on already posted" }, 400);
    }

    // Post comment to Reddit
    const result = await postComment(
      pileOn.primaryCommentId,
      pileOn.aiDraftReply,
      pileOn.pileOnAccount.username,
      pileOn.pileOnAccount.password || undefined
    );

    if (!result.success || !result.commentId) {
      return c.json({ error: result.error || "Failed to post pile-on comment" }, 500);
    }

    // Update pile-on status
    await db.pileOnComment.update({
      where: { id: pileOnId },
      data: {
        status: "posted",
        pileOnCommentId: result.commentId,
        postedAt: new Date(),
      },
    });

    // Log interaction
    if (pileOn.opportunity.accountId) {
      await db.accountInteractionLog.create({
        data: {
          account1Id: pileOn.opportunity.accountId,
          account2Id: pileOn.pileOnAccountId,
          interactionType: "pile_on",
          threadId: pileOn.opportunity.threadId,
          subreddit: pileOn.opportunity.subreddit,
        },
      });
    }

    return c.json({
      success: true,
      commentId: result.commentId,
      permalinkUrl: result.permalinkUrl,
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
