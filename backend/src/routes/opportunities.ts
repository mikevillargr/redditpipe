import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { generateReplyDraft, rewriteReply } from "../lib/ai.js";
import { markAsPublished, submitPermalink } from "../lib/verification.js";
import { analyzeDismissals } from "../lib/ai-scoring.js";

const app = new Hono();

// GET /api/opportunities
app.get("/", async (c) => {
  try {
    const clientId = c.req.query("clientId");
    const accountId = c.req.query("accountId");
    const status = c.req.query("status");
    const minScore = c.req.query("minScore");
    const startDate = c.req.query("startDate");
    const endDate = c.req.query("endDate");
    const threadId = c.req.query("threadId");

    const where: Record<string, unknown> = {};
    if (clientId && clientId !== "all") where.clientId = clientId;
    if (accountId) where.accountId = accountId;
    if (threadId) where.threadId = threadId;
    if (status && status !== "all") where.status = status;
    if (minScore) where.relevanceScore = { gte: parseFloat(minScore) };
    if (startDate || endDate) {
      where.createdAt = {} as Record<string, unknown>;
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate + "T23:59:59.999Z");
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        account: {
          select: {
            id: true, username: true, password: true, status: true,
            postsTodayCount: true, maxPostsPerDay: true,
            organicPostsWeek: true, citationPostsWeek: true,
          },
        },
      },
    });

    return c.json(opportunities);
  } catch (error) {
    console.error("GET /api/opportunities error:", error);
    return c.json({ error: "Failed to fetch opportunities" }, 500);
  }
});

// GET /api/opportunities/dismissals
app.get("/dismissals", async (c) => {
  try {
    const analysis = await analyzeDismissals();
    return c.json(analysis);
  } catch (error) {
    console.error("GET /api/opportunities/dismissals error:", error);
    return c.json({ error: "Failed to analyze dismissals" }, 500);
  }
});

// DELETE /api/opportunities/all — nuclear: clear ALL opportunities + dismissal logs
app.delete("/all", async (c) => {
  try {
    const body = await c.req.json();
    if (body?.confirm !== "DELETE_ALL_OPPORTUNITIES") {
      return c.json({ error: "Confirmation required: send { confirm: 'DELETE_ALL_OPPORTUNITIES' }" }, 400);
    }
    const dismissals = await prisma.dismissalLog.deleteMany({});
    const opps = await prisma.opportunity.deleteMany({});
    console.log(`[NUCLEAR] Cleared ${opps.count} opportunities and ${dismissals.count} dismissal logs`);
    return c.json({ deleted: opps.count, dismissalsCleared: dismissals.count });
  } catch (error) {
    console.error("DELETE /api/opportunities/all error:", error);
    return c.json({ error: "Failed to clear opportunities" }, 500);
  }
});

// GET /api/opportunities/:id
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: true,
        account: true,
      },
    });
    if (!opportunity) return c.json({ error: "Not found" }, 404);
    return c.json(opportunity);
  } catch (error) {
    console.error("GET /api/opportunities/:id error:", error);
    return c.json({ error: "Failed to fetch opportunity" }, 500);
  }
});

// PATCH /api/opportunities/:id
app.patch("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    // If dismissing, log it and hard delete
    if (body.status === "dismissed") {
      const opp = await prisma.opportunity.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });

      if (opp) {
        await prisma.dismissalLog.create({
          data: {
            clientId: opp.clientId,
            clientName: opp.client?.name || "Unknown",
            threadId: opp.threadId,
            subreddit: opp.subreddit,
            title: opp.title,
            relevanceScore: opp.relevanceScore,
            reason: body.dismissReason || "No reason provided",
          },
        });
        await prisma.opportunity.delete({ where: { id } });
      }

      return c.json({ success: true });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: body,
      include: {
        client: { select: { id: true, name: true } },
        account: {
          select: {
            id: true, username: true, password: true, status: true,
            postsTodayCount: true, maxPostsPerDay: true,
            organicPostsWeek: true, citationPostsWeek: true,
          },
        },
      },
    });

    return c.json(updated);
  } catch (error) {
    console.error("PATCH /api/opportunities/:id error:", error);
    return c.json({ error: "Failed to update opportunity" }, 500);
  }
});

// POST /api/opportunities/:id/rewrite
app.post("/:id/rewrite", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { action, userPrompt } = body;

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { client: true, account: true },
    });
    if (!opportunity) return c.json({ error: "Not found" }, 404);

    let newDraft: string;

    if (!opportunity.aiDraftReply || action === "regenerate") {
      newDraft = await generateReplyDraft({
        threadTitle: opportunity.title,
        threadBody: opportunity.bodySnippet || "",
        topComments: opportunity.topComments || "",
        subreddit: opportunity.subreddit,
        clientName: opportunity.client?.name || "the client",
        clientUrl: opportunity.client?.websiteUrl || "",
        clientDescription: opportunity.client?.description || "",
        clientMentionTerms: opportunity.client?.mentionTerms || opportunity.client?.name || "",
        accountUsername: opportunity.account?.username,
        accountPersonality: opportunity.account?.personalitySummary || undefined,
        accountStyleNotes: opportunity.account?.writingStyleNotes || undefined,
        accountSampleComments: opportunity.account?.sampleComments || undefined,
      });
    } else {
      newDraft = await rewriteReply(
        opportunity.aiDraftReply,
        action as "regenerate" | "shorter" | "casual" | "formal",
        {
          accountPersonality: opportunity.account?.personalitySummary || undefined,
          clientName: opportunity.client?.name || undefined,
          userPrompt: userPrompt || undefined,
        }
      );
    }

    await prisma.opportunity.update({ where: { id }, data: { aiDraftReply: newDraft } });
    return c.json({ aiDraftReply: newDraft });
  } catch (error) {
    console.error("POST /api/opportunities/:id/rewrite error:", error);
    return c.json({ error: "Rewrite failed", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// POST /api/opportunities/:id/verify
app.post("/:id/verify", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await markAsPublished(id);
    return c.json(result);
  } catch (error) {
    console.error("POST /api/opportunities/:id/verify error:", error);
    return c.json({ error: "Verification failed", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// POST /api/opportunities/:id/manual-verify
app.post("/:id/manual-verify", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    if (!body.permalinkUrl) return c.json({ error: "Missing required field: permalinkUrl" }, 400);
    const result = await submitPermalink(id, body.permalinkUrl);
    return c.json(result);
  } catch (error) {
    console.error("POST /api/opportunities/:id/manual-verify error:", error);
    return c.json({ error: "Manual verification failed", details: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// POST /api/opportunities/bulk
app.post("/bulk", async (c) => {
  try {
    const body = await c.req.json();
    const { ids, action, dismissReason } = body as { ids: string[]; action: "publish" | "dismiss"; dismissReason?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: "No IDs provided" }, 400);
    if (!["publish", "dismiss"].includes(action)) return c.json({ error: "Invalid action" }, 400);

    if (action === "dismiss") {
      if (!dismissReason || !dismissReason.trim()) return c.json({ error: "Dismissal reason is required" }, 400);

      // Process in chunks to avoid SQLite variable limits and timeouts
      const CHUNK_SIZE = 100;
      let totalDismissed = 0;

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        const chunk = ids.slice(i, i + CHUNK_SIZE);

        const opps = await prisma.opportunity.findMany({
          where: { id: { in: chunk } },
          include: { client: { select: { id: true, name: true } } },
        });

        if (opps.length > 0) {
          await prisma.dismissalLog.createMany({
            data: opps.map((opp) => ({
              clientId: opp.clientId,
              clientName: opp.client?.name || "Unknown",
              threadId: opp.threadId,
              subreddit: opp.subreddit,
              title: opp.title,
              relevanceScore: opp.relevanceScore,
              reason: dismissReason.trim(),
            })),
          });

          await prisma.opportunity.deleteMany({ where: { id: { in: chunk } } });
          totalDismissed += opps.length;
        }
      }

      return c.json({ success: true, count: totalDismissed, action: "dismissed" });
    }

    await prisma.opportunity.updateMany({ where: { id: { in: ids } }, data: { status: "published" } });
    return c.json({ success: true, count: ids.length, action });
  } catch (error) {
    console.error("POST /api/opportunities/bulk error:", error);
    return c.json({ error: "Bulk action failed" }, 500);
  }
});

// POST /api/opportunities/bulk-dismiss
app.post("/bulk-dismiss", async (c) => {
  try {
    const body = await c.req.json();
    const { ids, reason } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) return c.json({ error: "Missing required field: ids" }, 400);
    if (!reason || !reason.trim()) return c.json({ error: "Dismissal reason is required" }, 400);

    const opps = await prisma.opportunity.findMany({
      where: { id: { in: ids } },
      include: { client: { select: { id: true, name: true } } },
    });

    for (const opp of opps) {
      await prisma.dismissalLog.create({
        data: {
          clientId: opp.clientId,
          clientName: opp.client?.name || "Unknown",
          threadId: opp.threadId,
          subreddit: opp.subreddit,
          title: opp.title,
          relevanceScore: opp.relevanceScore,
          reason: reason.trim(),
        },
      });
    }

    const result = await prisma.opportunity.deleteMany({ where: { id: { in: ids } } });
    return c.json({ deleted: result.count });
  } catch (error) {
    console.error("POST /api/opportunities/bulk-dismiss error:", error);
    return c.json({ error: "Failed to bulk dismiss" }, 500);
  }
});

export default app;
