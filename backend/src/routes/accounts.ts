import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { getUserProfile, getUserComments } from "../lib/reddit.js";
import { processAssignmentQueue } from "../lib/assignment-queue.js";

const app = new Hono();

// GET /api/accounts
app.get("/", async (c) => {
  try {
    const username = c.req.query("username");
    const where: Record<string, unknown> = {};
    if (username) where.username = username;

    const accounts = await prisma.redditAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        accountAssignments: { include: { client: { select: { id: true, name: true } } } },
        _count: { select: { opportunities: true } },
      },
    });
    return c.json(accounts);
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return c.json({ error: "Failed to fetch accounts" }, 500);
  }
});

// POST /api/accounts
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password, status, activeSubreddits, maxPostsPerDay, minHoursBetweenPosts, clientIds } = body;

    if (!username) return c.json({ error: "Missing required field: username" }, 400);

    const account = await prisma.redditAccount.create({
      data: {
        username,
        password: password || null,
        status: status || "warming",
        activeSubreddits: activeSubreddits ? JSON.stringify(activeSubreddits) : null,
        maxPostsPerDay: maxPostsPerDay || 3,
        minHoursBetweenPosts: minHoursBetweenPosts || 4,
      },
    });

    // Create client assignments
    if (clientIds && Array.isArray(clientIds)) {
      for (const clientId of clientIds) {
        await prisma.accountClientAssignment.create({
          data: { accountId: account.id, clientId },
        });
      }
    }

    // Trigger assignment queue to assign this account to unassigned opportunities
    processAssignmentQueue().catch((err) => 
      console.error("[Accounts] Failed to process assignment queue:", err)
    );

    return c.json(account, 201);
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

// GET /api/accounts/:id
app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const account = await prisma.redditAccount.findUnique({
      where: { id },
      include: {
        accountAssignments: { include: { client: true } },
        opportunities: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!account) return c.json({ error: "Not found" }, 404);
    return c.json(account);
  } catch (error) {
    console.error("GET /api/accounts/:id error:", error);
    return c.json({ error: "Failed to fetch account" }, 500);
  }
});

// PUT /api/accounts/:id
app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { clientIds, ...accountData } = body;

    if (accountData.activeSubreddits && Array.isArray(accountData.activeSubreddits)) {
      accountData.activeSubreddits = JSON.stringify(accountData.activeSubreddits);
    }

    const account = await prisma.redditAccount.update({ where: { id }, data: accountData });

    // Update client assignments if provided
    if (clientIds && Array.isArray(clientIds)) {
      await prisma.accountClientAssignment.deleteMany({ where: { accountId: id } });
      for (const clientId of clientIds) {
        await prisma.accountClientAssignment.create({
          data: { accountId: id, clientId },
        });
      }
    }

    // Trigger assignment queue if account status changed to active
    if (accountData.status === "active") {
      processAssignmentQueue().catch((err) => 
        console.error("[Accounts] Failed to process assignment queue:", err)
      );
    }

    return c.json(account);
  } catch (error) {
    console.error("PUT /api/accounts/:id error:", error);
    return c.json({ error: "Failed to update account" }, 500);
  }
});

// DELETE /api/accounts/:id
app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await prisma.redditAccount.delete({ where: { id } });
    return c.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts/:id error:", error);
    return c.json({ error: "Failed to delete account" }, 500);
  }
});

// POST /api/accounts/:id/analyze — fetch Reddit profile + recent comments
app.post("/:id/analyze", async (c) => {
  try {
    const id = c.req.param("id");
    const account = await prisma.redditAccount.findUnique({ where: { id } });
    if (!account) return c.json({ error: "Not found" }, 404);

    const [profile, comments] = await Promise.all([
      getUserProfile(account.username),
      getUserComments(account.username, 25),
    ]);

    const subreddits = [...new Set(comments.map((c) => c.subreddit))];
    const sampleComments = comments
      .slice(0, 5)
      .map((c) => `[r/${c.subreddit}] ${c.body.slice(0, 200)}`)
      .join("\n---\n");

    const updated = await prisma.redditAccount.update({
      where: { id },
      data: {
        accountAgeDays: Math.floor((Date.now() / 1000 - profile.created_utc) / 86400),
        postKarma: profile.link_karma,
        commentKarma: profile.comment_karma,
        activeSubreddits: JSON.stringify(subreddits),
        sampleComments,
      },
    });

    return c.json(updated);
  } catch (error) {
    console.error("POST /api/accounts/:id/analyze error:", error);
    return c.json({ error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown" }, 500);
  }
});

// POST /api/accounts/:id/log-organic — Chrome extension: increment organic post count
app.post("/:id/log-organic", async (c) => {
  try {
    const id = c.req.param("id");
    const account = await prisma.redditAccount.findUnique({ where: { id } });
    if (!account) return c.json({ error: "Not found" }, 404);

    const updated = await prisma.redditAccount.update({
      where: { id },
      data: { organicPostsWeek: { increment: 1 } },
      select: {
        id: true, username: true, organicPostsWeek: true,
        citationPostsWeek: true, postsTodayCount: true, maxPostsPerDay: true,
      },
    });
    return c.json(updated);
  } catch (error) {
    console.error("POST /api/accounts/:id/log-organic error:", error);
    return c.json({ error: "Failed to log organic post" }, 500);
  }
});

// GET /api/accounts/:id/activity
app.get("/:id/activity", async (c) => {
  try {
    const id = c.req.param("id");
    const account = await prisma.redditAccount.findUnique({ where: { id } });
    if (!account) return c.json({ error: "Not found" }, 404);

    const comments = await getUserComments(account.username, 25);
    return c.json(comments);
  } catch (error) {
    console.error("GET /api/accounts/:id/activity error:", error);
    return c.json({ error: "Failed to fetch activity" }, 500);
  }
});

export default app;
