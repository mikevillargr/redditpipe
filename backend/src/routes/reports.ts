import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";

const reports = new Hono();

interface PileOnComment {
  username: string;
  commentText: string;
  permalink: string;
  postedAt: Date;
}

interface ReportOpportunity {
  id: string;
  threadTitle: string;
  threadUrl: string;
  heuristicScore: number | null;
  aiScore: number | null;
  aiScoreCommentary: string | null;
  aiScoreFactors: {
    subredditRelevance?: number;
    topicMatch?: number;
    intent?: number;
    naturalFit?: number;
  } | null;
  status: string;
  commentText: string | null;
  citationAnchorText: string | null;
  commentPermalink: string | null;
  subreddit: string;
  threadCreatedAt: Date | null;
  publishedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  opportunityType: string;
  parentOpportunityId: string | null;
  parentThreadTitle: string | null;
  pileOnComments: PileOnComment[];
}

reports.get("/clients/:clientId", async (c) => {
  const clientId = c.req.param("clientId");
  const db = createPrismaClient();

  try {
    // Fetch client(s) to get mention terms for citation extraction
    const clients = clientId === 'all' 
      ? await db.client.findMany({ select: { id: true, mentionTerms: true, name: true } })
      : [await db.client.findUnique({
          where: { id: clientId },
          select: { id: true, mentionTerms: true, name: true },
        })];

    const clientMap = new Map(clients.filter((c): c is { id: string; mentionTerms: string | null; name: string } => c !== null).map(c => [c.id, c]));

    const opportunities = await db.opportunity.findMany({
      where: clientId === 'all' ? undefined : { clientId },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
        parentOpportunity: {
          select: { title: true },
        },
        pileOnComments: {
          where: { status: "posted" },
          include: {
            pileOnAccount: {
              select: { username: true },
            },
          },
        },
      },
    });

    const reportData: ReportOpportunity[] = opportunities.map((opp) => {
      // Get the client for this opportunity
      const client = clientMap.get(opp.clientId);

      // Parse aiRelevanceNote if it exists
      let aiScoreCommentary = null;
      let aiScoreFactors = null;
      let aiScore = null;

      if (opp.aiRelevanceNote) {
        try {
          const parsed = JSON.parse(opp.aiRelevanceNote);
          aiScoreCommentary = parsed.note || null;
          aiScoreFactors = parsed.factors || null;
        } catch {
          aiScoreCommentary = opp.aiRelevanceNote;
        }
      }

      // Extract citation anchor text from aiDraftReply
      let citationAnchorText = null;
      if (opp.aiDraftReply && client) {
        // First, look for markdown links like [text](url)
        const linkMatches = opp.aiDraftReply.match(/\[([^\]]+)\]\([^)]+\)/g);
        if (linkMatches) {
          citationAnchorText = linkMatches
            .map((match) => match.match(/\[([^\]]+)\]/)?.[1])
            .filter(Boolean)
            .join(", ");
        }
        
        // If no markdown links found, look for plain text mentions of client name or mention terms
        if (!citationAnchorText) {
          const mentionTerms = client.mentionTerms ? client.mentionTerms.split(",").map((t: string) => t.trim()) : [];
          const allTerms = [client.name, ...mentionTerms];
          
          // Find all mentions in the text (case-insensitive)
          const foundMentions: string[] = [];
          for (const term of allTerms) {
            if (term) {
              const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
              const matches = opp.aiDraftReply.match(regex);
              if (matches && matches.length > 0) {
                // Use the actual matched text (preserves case)
                foundMentions.push(matches[0]);
              }
            }
          }
          
          if (foundMentions.length > 0) {
            citationAnchorText = [...new Set(foundMentions)].join(", ");
          }
        }
      }

      // Map pile-on comments
      const pileOns: PileOnComment[] = (opp as any).pileOnComments?.map((pc: any) => ({
        username: pc.pileOnAccount.username,
        commentText: pc.aiDraftReply,
        permalink: pc.pileOnCommentId || "",
        postedAt: pc.postedAt,
      })) || [];

      return {
        id: opp.id,
        threadTitle: opp.title,
        threadUrl: opp.threadUrl,
        heuristicScore: opp.relevanceScore || null,
        aiScore: opp.relevanceScore || null,
        aiScoreCommentary,
        aiScoreFactors,
        status: opp.status,
        commentText: opp.aiDraftReply || null,
        citationAnchorText,
        commentPermalink: opp.permalinkUrl || null,
        subreddit: opp.subreddit,
        threadCreatedAt: opp.threadCreatedAt || null,
        publishedAt: opp.publishedAt || null,
        deletedAt: opp.deletedAt || null,
        createdAt: opp.createdAt,
        opportunityType: opp.opportunityType || "primary",
        parentOpportunityId: opp.parentOpportunityId || null,
        parentThreadTitle: (opp as any).parentOpportunity?.title || null,
        pileOnComments: pileOns,
      };
    });

    return c.json({ opportunities: reportData });
  } finally {
    await db.$disconnect().catch(() => {});
  }
});

export default reports;
