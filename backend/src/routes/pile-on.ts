import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
import { selectPileOnAccount } from "../lib/pile-on-matching.js";
import { generatePileOnComment } from "../lib/ai-pile-on.js";
import { postComment } from "../lib/reddit.js";

const app = new Hono();

/**
 * POST /api/opportunities/:id/pile-on
 * Generate a pile-on comment draft for an opportunity
 */
app.post("/:id/pile-on", async (c) => {
  const opportunityId = c.req.param("id");
  const db = createPrismaClient();

  try {
    // Check if pile-on is enabled
    const settings = await db.settings.findUnique({ where: { id: "singleton" } });
    if (!settings?.pileOnEnabled) {
      return c.json({ error: "Pile-on feature is not enabled" }, 400);
    }

    // Get the opportunity
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

    if (!opportunity.accountId || !opportunity.permalinkUrl) {
      return c.json({ error: "Opportunity missing account or permalink" }, 400);
    }

    // Check if max pile-ons reached
    const existingPileOns = await db.pileOnComment.count({
      where: { opportunityId },
    });

    if (existingPileOns >= (settings.pileOnMaxPerOpportunity || 2)) {
      return c.json({ error: "Maximum pile-ons reached for this opportunity" }, 400);
    }

    // Check if enough time has passed since primary comment
    if (opportunity.updatedAt) {
      const minDelayMs = (settings.pileOnDelayMinHours || 2) * 60 * 60 * 1000;
      const timeSincePost = Date.now() - opportunity.updatedAt.getTime();
      
      if (timeSincePost < minDelayMs) {
        const hoursRemaining = Math.ceil((minDelayMs - timeSincePost) / (60 * 60 * 1000));
        return c.json({ 
          error: `Must wait at least ${settings.pileOnDelayMinHours} hours before pile-on. ${hoursRemaining}h remaining.` 
        }, 400);
      }
    }

    // Select best pile-on account
    const pileOnAccount = await selectPileOnAccount(
      opportunityId,
      opportunity.accountId,
      opportunity.clientId
    );

    if (!pileOnAccount) {
      return c.json({ error: "No suitable pile-on account available" }, 400);
    }

    // Generate pile-on comment
    const aiDraftReply = await generatePileOnComment({
      primaryComment: opportunity.aiDraftReply || "",
      threadTitle: opportunity.title,
      threadBody: opportunity.bodySnippet || "",
      clientName: opportunity.client.name,
      clientDescription: opportunity.client.description,
      pileOnAccountPersonality: pileOnAccount.personalitySummary,
      pileOnAccountWritingStyle: pileOnAccount.writingStyleNotes,
    });

    // Extract comment ID from permalink (e.g., /r/subreddit/comments/threadid/title/commentid)
    const permalinkParts = opportunity.permalinkUrl.split("/");
    const primaryCommentId = permalinkParts[permalinkParts.length - 1] || "";

    // Create draft pile-on comment
    const pileOn = await db.pileOnComment.create({
      data: {
        opportunityId,
        primaryCommentId,
        pileOnAccountId: pileOnAccount.id,
        aiDraftReply,
        status: "draft",
      },
    });

    return c.json({
      id: pileOn.id,
      aiDraftReply,
      pileOnAccount: {
        id: pileOnAccount.id,
        username: pileOnAccount.username,
        commentKarma: pileOnAccount.commentKarma,
      },
      status: "draft",
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
