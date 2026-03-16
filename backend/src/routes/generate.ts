import { Hono } from "hono";
import { prisma } from "../lib/prisma.js";
import { generateReplyDraft } from "../lib/ai.js";

const app = new Hono();

interface OnDemandGenerateRequest {
  accountId: string;
  clientId?: string;
  threadTitle: string;
  threadBody: string;
  threadUrl: string;
  subreddit: string;
  parentCommentBody?: string; // If replying to a comment instead of thread
  parentCommentAuthor?: string;
}

// POST /api/generate/on-demand
// Generate AI reply for any Reddit thread/comment while browsing
app.post("/on-demand", async (c) => {
  try {
    const body = await c.req.json() as OnDemandGenerateRequest;
    const { accountId, clientId, threadTitle, threadBody, threadUrl, subreddit, parentCommentBody, parentCommentAuthor } = body;

    if (!accountId || !threadTitle || !threadUrl || !subreddit) {
      return c.json({ error: "Missing required fields: accountId, threadTitle, threadUrl, subreddit" }, 400);
    }

    // Fetch account details
    const account = await prisma.redditAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        username: true,
        personalitySummary: true,
        writingStyleNotes: true,
        sampleComments: true,
      },
    });

    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Fetch client details (use first active client if not specified)
    let client;
    if (clientId) {
      client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, websiteUrl: true, description: true, mentionTerms: true },
      });
    } else {
      // Get first active client as default
      const clients = await prisma.client.findMany({
        where: { status: "active" },
        select: { id: true, name: true, websiteUrl: true, description: true, mentionTerms: true },
        take: 1,
      });
      client = clients[0] || null;
    }

    if (!client) {
      return c.json({ error: "No active client found. Please specify a clientId or activate a client." }, 400);
    }

    // Build context for AI generation
    let contextBody = threadBody;
    let contextNote = "";

    if (parentCommentBody) {
      // Replying to a comment
      contextNote = `\n\nYou are replying to this comment by u/${parentCommentAuthor || "unknown"}:\n"${parentCommentBody}"`;
      contextBody = threadBody + contextNote;
    }

    // Generate AI draft using the same logic as opportunities
    const aiDraftReply = await generateReplyDraft({
      threadTitle,
      threadBody: contextBody,
      topComments: "", // Not available for on-demand generation
      subreddit,
      clientName: client.name,
      clientUrl: client.websiteUrl || "",
      clientDescription: client.description || "",
      clientMentionTerms: client.mentionTerms || client.name,
      accountUsername: account.username,
      accountPersonality: account.personalitySummary || undefined,
      accountStyleNotes: account.writingStyleNotes || undefined,
      accountSampleComments: account.sampleComments || undefined,
    });

    return c.json({
      aiDraftReply,
      account: {
        id: account.id,
        username: account.username,
      },
      client: {
        id: client.id,
        name: client.name,
      },
      context: {
        threadTitle,
        threadUrl,
        subreddit,
        isCommentReply: !!parentCommentBody,
        parentCommentAuthor: parentCommentAuthor || null,
      },
    });
  } catch (error) {
    console.error("POST /api/generate/on-demand error:", error);
    return c.json({ 
      error: "AI generation failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, 500);
  }
});

export default app;
