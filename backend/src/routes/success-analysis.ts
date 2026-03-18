import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
import { getAverageDeletionTime } from "../lib/success-analysis.js";
import Anthropic from "@anthropic-ai/sdk";

const app = new Hono();

async function getAnthropicClient() {
  const prisma = createPrismaClient();
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });
    const apiKey = settings?.anthropicApiKey;
    if (!apiKey) throw new Error("Anthropic API key not configured");
    return new Anthropic({ apiKey });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

// POST /api/success-analysis/analyze/:opportunityId
app.post("/analyze/:opportunityId", async (c) => {
  const opportunityId = c.req.param("opportunityId");
  const prisma = createPrismaClient();

  try {
    // Fetch opportunity with full context
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: {
        client: true,
        account: true,
      },
    });

    if (!opportunity) {
      return c.json({ error: "Opportunity not found" }, 404);
    }

    if (opportunity.status !== "published" || !opportunity.publishedAt) {
      return c.json({ error: "Opportunity is not published" }, 400);
    }

    // Check if already analyzed
    const existing = await prisma.successAnalysis.findUnique({
      where: { opportunityId },
    });

    if (existing) {
      return c.json({ error: "Analysis already exists for this opportunity" }, 400);
    }

    // Check if opportunity has aged past average deletion time
    const avgDeletionTime = await getAverageDeletionTime();
    const ageHours = (Date.now() - opportunity.publishedAt.getTime()) / (1000 * 60 * 60);
    
    if (ageHours < avgDeletionTime) {
      return c.json({ 
        error: `Opportunity too young for success analysis (${ageHours.toFixed(1)}h old, need ${avgDeletionTime.toFixed(1)}h)` 
      }, 400);
    }

    // Extract citation info
    const citationIncluded = opportunity.aiDraftReply?.includes("http") || false;
    let citationUrl = null;
    if (citationIncluded && opportunity.aiDraftReply) {
      const urlMatch = opportunity.aiDraftReply.match(/https?:\/\/[^\s\)]+/);
      if (urlMatch) citationUrl = urlMatch[0];
    }

    // Prepare AI analysis prompt
    const prompt = `Analyze why this Reddit comment was successful (not deleted or auto-moderated).

**CONTEXT:** This is a Reddit outreach tool designed to discreetly drop citations for clients across multiple industries. Recommendations must be UNIVERSAL and applicable to all clients, not specific to this particular client or industry.

**Subreddit:** r/${opportunity.subreddit}
**Thread Title:** ${opportunity.title}
**Thread Context:** ${opportunity.bodySnippet || "N/A"}
**Top Comments:** ${opportunity.topComments || "N/A"}
**Our Comment:** ${opportunity.aiDraftReply || "N/A"}
**Citation Included:** ${citationIncluded ? "Yes" : "No"}
${citationUrl ? `**Citation URL:** ${citationUrl}` : ""}
**Age:** ${ageHours.toFixed(1)} hours (survived past avg deletion time of ${avgDeletionTime.toFixed(1)}h)
**Client:** ${opportunity.client.name}
**Client Website:** ${opportunity.client.websiteUrl}

Analyze what made this comment successful. Consider:
1. Tone, style, and approach that worked well
2. How the comment provided value to the discussion
3. Natural integration of any citations or recommendations
4. Subreddit-specific patterns that contributed to success
5. General best practices demonstrated

Provide your analysis in JSON format with:
{
  "confidence": 0.0-1.0,
  "successFactors": ["factor1", "factor2", ...],
  "recommendations": {
    "filtering": ["rec1", "rec2", ...],
    "generation": ["rec1", "rec2", ...]
  },
  "analysis": "2-3 sentence summary of why this comment succeeded"
}

CRITICAL REQUIREMENTS FOR RECOMMENDATIONS:
- "filtering" recommendations must be UNIVERSAL patterns applicable across ALL industries and clients
  * Focus on thread characteristics (e.g., "Prioritize threads with specific questions", "Avoid news/announcement threads")
  * Focus on engagement patterns (e.g., "Look for threads with 10+ comments", "Prioritize threads under 6 hours old")
  * DO NOT include client-specific filters (e.g., vehicle years, specific product types, industry-specific terms)
  * DO NOT include subreddit-specific rules (those are already handled per-subreddit)
  
- "generation" recommendations must be UNIVERSAL writing patterns applicable to all citation drops
  * Focus on tone and structure (e.g., "Lead with helpful advice before mentioning products", "Use casual, conversational tone")
  * Focus on integration techniques (e.g., "Mention 2-3 options including the client", "Frame recommendations as personal experience")
  * DO NOT include industry-specific advice (e.g., "Focus on legal concepts" - that's only for law firms)
  * DO NOT include product-specific guidance (e.g., "Mention warranty details" - that's only for certain products)

Think: "Would this recommendation help improve citation drops for a fitness coach, a law firm, AND a SaaS company?" If not, it's too specific.`;

    // Call Anthropic API
    const anthropic = await getAnthropicClient();
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const response = await anthropic.messages.create({
      model: settings?.aiModelDetection || "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    let analysisData;
    
    if (content.type === "text") {
      // Extract JSON from response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Failed to parse AI response");
      }
    } else {
      throw new Error("Unexpected response type from AI");
    }

    // Store analysis
    const analysis = await prisma.successAnalysis.create({
      data: {
        opportunityId,
        subreddit: opportunity.subreddit,
        commentText: opportunity.aiDraftReply || "",
        threadTitle: opportunity.title,
        threadContext: `${opportunity.bodySnippet || ""}\n\nTop Comments:\n${opportunity.topComments || ""}`,
        citationIncluded,
        citationUrl,
        publishedAt: opportunity.publishedAt,
        analyzedAt: new Date(),
        ageAtAnalysis: ageHours,
        aiAnalysis: JSON.stringify(analysisData),
        successFactors: JSON.stringify(analysisData.successFactors || []),
        recommendations: JSON.stringify(analysisData.recommendations || {}),
        confidence: analysisData.confidence,
      },
    });

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error("POST /api/success-analysis/analyze error:", error);
    return c.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

// GET /api/success-analysis/insights
app.get("/insights", async (c) => {
  const prisma = createPrismaClient();

  try {
    const analyses = await prisma.successAnalysis.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        opportunity: {
          select: {
            opportunityType: true,
            client: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Aggregate insights
    const totalAnalyzed = analyses.length;
    
    // Calculate average age
    const avgAge = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.ageAtAnalysis, 0) / analyses.length
      : 0;

    // Group success factors
    const successFactorCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      if (a.successFactors) {
        try {
          const factors = JSON.parse(a.successFactors);
          factors.forEach((factor: string) => {
            successFactorCounts[factor] = (successFactorCounts[factor] || 0) + 1;
          });
        } catch {}
      }
    });

    // Group by subreddit
    const subredditStats: Record<string, { count: number; avgConfidence: number; topFactors: string[] }> = {};
    analyses.forEach((a) => {
      if (!subredditStats[a.subreddit]) {
        subredditStats[a.subreddit] = { count: 0, avgConfidence: 0, topFactors: [] };
      }
      subredditStats[a.subreddit].count++;
      subredditStats[a.subreddit].avgConfidence += a.confidence;
      
      // Collect factors for this subreddit
      if (a.successFactors) {
        try {
          const factors = JSON.parse(a.successFactors);
          subredditStats[a.subreddit].topFactors.push(...factors);
        } catch {}
      }
    });

    // Calculate averages and get top factors per subreddit
    Object.keys(subredditStats).forEach((sub) => {
      subredditStats[sub].avgConfidence /= subredditStats[sub].count;
      
      // Get most common factors for this subreddit
      const factorCounts: Record<string, number> = {};
      subredditStats[sub].topFactors.forEach((f) => {
        factorCounts[f] = (factorCounts[f] || 0) + 1;
      });
      subredditStats[sub].topFactors = Object.entries(factorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([factor]) => factor);
    });

    // Aggregate recommendations
    const filteringRecs: Record<string, number> = {};
    const generationRecs: Record<string, number> = {};
    
    analyses.forEach((a) => {
      if (a.recommendations) {
        try {
          const recs = JSON.parse(a.recommendations);
          if (recs.filtering) {
            recs.filtering.forEach((rec: string) => {
              filteringRecs[rec] = (filteringRecs[rec] || 0) + 1;
            });
          }
          if (recs.generation) {
            recs.generation.forEach((rec: string) => {
              generationRecs[rec] = (generationRecs[rec] || 0) + 1;
            });
          }
        } catch {}
      }
    });

    // Sort recommendations by frequency
    const topFilteringRecs = Object.entries(filteringRecs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([rec, count]) => ({ text: rec, frequency: count }));

    const topGenerationRecs = Object.entries(generationRecs)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([rec, count]) => ({ text: rec, frequency: count }));

    // Identify general patterns (appear in multiple subreddits)
    const factorsBySubreddit: Record<string, Set<string>> = {};
    analyses.forEach((a) => {
      if (!factorsBySubreddit[a.subreddit]) {
        factorsBySubreddit[a.subreddit] = new Set();
      }
      if (a.successFactors) {
        try {
          const factors = JSON.parse(a.successFactors);
          factors.forEach((f: string) => factorsBySubreddit[a.subreddit].add(f));
        } catch {}
      }
    });

    const generalPatterns: string[] = [];
    Object.values(successFactorCounts).forEach((count) => {
      if (count >= Math.max(2, Object.keys(factorsBySubreddit).length * 0.3)) {
        // Factor appears in at least 30% of subreddits or 2+ subreddits
        const factor = Object.keys(successFactorCounts).find(k => successFactorCounts[k] === count);
        if (factor && !generalPatterns.includes(factor)) {
          generalPatterns.push(factor);
        }
      }
    });

    return c.json({
      totalAnalyzed,
      avgAge,
      successFactors: successFactorCounts,
      subredditStats,
      generalPatterns,
      recommendations: {
        filtering: topFilteringRecs,
        generation: topGenerationRecs,
      },
      recentAnalyses: analyses.slice(0, 10).map((a) => ({
        id: a.id,
        subreddit: a.subreddit,
        confidence: a.confidence,
        ageAtAnalysis: a.ageAtAnalysis,
        createdAt: a.createdAt,
        clientName: a.opportunity.client.name,
        opportunityType: a.opportunity.opportunityType || 'primary',
      })),
    });
  } catch (error) {
    console.error("GET /api/success-analysis/insights error:", error);
    return c.json({ error: "Failed to fetch insights" }, 500);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

export default app;
