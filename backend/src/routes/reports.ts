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
    const opportunities = await db.opportunity.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      include: {
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
      if (opp.aiDraftReply) {
        // Look for markdown links like [text](url) or plain URLs
        const linkMatches = opp.aiDraftReply.match(/\[([^\]]+)\]\([^)]+\)/g);
        if (linkMatches) {
          citationAnchorText = linkMatches
            .map((match) => match.match(/\[([^\]]+)\]/)?.[1])
            .filter(Boolean)
            .join(", ");
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
