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

    console.log('[Generate On-Demand] Request received:', { accountId, threadTitle, subreddit, hasParentComment: !!parentCommentBody });

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

    console.log('[Generate On-Demand] Account lookup result:', account ? `Found: ${account.username}` : 'Not found');

    if (!account) {
      return c.json({ error: "Account not found" }, 404);
    }

    // Fetch client details ONLY if explicitly specified
    // For casual browsing/organic posts, no client means no citation
    let client = null;
    if (clientId) {
      client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, websiteUrl: true, description: true, mentionTerms: true },
      });
      
      if (!client) {
        return c.json({ error: "Client not found" }, 404);
      }
    }

    // Build context for AI generation
    // If replying to a comment, modify the thread body to include that context
    let effectiveThreadBody = threadBody;
    
    if (parentCommentBody) {
      // Replying to a comment - prepend the parent comment context
      effectiveThreadBody = `CONTEXT: You are replying to this comment by u/${parentCommentAuthor}:\n"${parentCommentBody}"\n\nOriginal thread: ${threadBody}`;
    }

    // Generate AI draft
    const aiDraftReply = await generateReplyDraft({
      threadTitle,
      threadBody: effectiveThreadBody,
      topComments: "", // Not available for on-demand generation
      subreddit,
      // Only include client info if a client was specified
      clientName: client?.name || "",
      clientUrl: client?.websiteUrl || "",
      clientDescription: client?.description || "",
      clientMentionTerms: client?.mentionTerms || "",
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
      client: client ? {
        id: client.id,
        name: client.name,
      } : null,
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
