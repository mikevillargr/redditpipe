import { Hono } from "hono";
import { createPrismaClient } from "../lib/prisma.js";
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

// POST /api/deletion-analysis/analyze/:opportunityId
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

    if (opportunity.status !== "deleted_by_mod" || !opportunity.deletedAt) {
      return c.json({ error: "Opportunity is not marked as deleted" }, 400);
    }

    // Check if analysis already exists
    const existing = await prisma.deletionAnalysis.findUnique({
      where: { opportunityId },
    });

    if (existing) {
      return c.json({ error: "Analysis already exists for this opportunity" }, 400);
    }

    // Extract citation info
    const citationIncluded = opportunity.aiDraftReply?.includes("http") || false;
    let citationUrl = null;
    if (citationIncluded && opportunity.aiDraftReply) {
      const urlMatch = opportunity.aiDraftReply.match(/https?:\/\/[^\s\)]+/);
      if (urlMatch) citationUrl = urlMatch[0];
    }

    // Calculate hours until deletion
    const publishedAt = opportunity.publishedAt || opportunity.createdAt;
    const deletedAt = opportunity.deletedAt;
    const hoursUntilDeletion = (deletedAt.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);

    // Prepare AI analysis prompt
    const prompt = `Analyze why this Reddit comment was deleted by moderators.

**CONTEXT:** This is a Reddit outreach tool designed to discreetly drop citations for clients in relevant discussions. The goal is to naturally recommend products/services while providing genuine value.

**Subreddit:** r/${opportunity.subreddit}
**Thread Title:** ${opportunity.title}
**Thread Context:** ${opportunity.bodySnippet || "N/A"}
**Top Comments:** ${opportunity.topComments || "N/A"}
**Our Comment:** ${opportunity.aiDraftReply || "N/A"}
**Citation Included:** ${citationIncluded ? "Yes" : "No"}
${citationUrl ? `**Citation URL:** ${citationUrl}` : ""}
**Time Until Deletion:** ${hoursUntilDeletion.toFixed(1)} hours
**Client:** ${opportunity.client.name}
**Client Website:** ${opportunity.client.websiteUrl}

Analyze the most likely reason this comment was deleted. Consider:
1. Subreddit rules and common moderation patterns
2. Comment quality, tone, and how naturally the citation was integrated
3. Whether the comment provided genuine value before mentioning the product
4. Timing of deletion (immediate vs delayed)
5. Patterns that may have triggered automated or manual removal

Provide your analysis in JSON format with:
{
  "reason": "primary reason category (spam/self-promotion/off-topic/rule-violation/low-quality/other)",
  "confidence": 0.0-1.0,
  "detailed_analysis": "2-3 sentence explanation",
  "patterns": ["pattern1", "pattern2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...]
}

IMPORTANT FOR RECOMMENDATIONS:
- Focus on HOW to integrate citations more naturally (e.g., "Provide more value before mentioning products", "Use softer language when recommending")
- Focus on comment quality and tone improvements
- Focus on subreddit-specific patterns to avoid
- DO NOT recommend removing citations, disclosing relationships, or avoiding product mentions - that defeats the purpose
- DO NOT recommend generic advice like "review subreddit rules" - be specific about what to avoid
- Recommendations should help improve future citation drops, not eliminate them`;

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
    const analysis = await prisma.deletionAnalysis.create({
      data: {
        opportunityId,
        subreddit: opportunity.subreddit,
        commentText: opportunity.aiDraftReply || "",
        threadTitle: opportunity.title,
        threadContext: `${opportunity.bodySnippet || ""}\n\nTop Comments:\n${opportunity.topComments || ""}`,
        citationIncluded,
        citationUrl,
        publishedAt,
        deletedAt,
        hoursUntilDeletion,
        aiAnalysis: JSON.stringify(analysisData),
        likelyReason: analysisData.reason,
        confidence: analysisData.confidence,
        patterns: JSON.stringify(analysisData.patterns || []),
        recommendations: JSON.stringify(analysisData.recommendations || []),
      },
    });

    return c.json({ success: true, analysis });
  } catch (error) {
    console.error("POST /api/deletion-analysis/analyze error:", error);
    return c.json(
      { error: "Analysis failed", details: error instanceof Error ? error.message : "Unknown error" },
      500
    );
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

// GET /api/deletion-analysis/insights
app.get("/insights", async (c) => {
  const prisma = createPrismaClient();

  try {
    const analyses = await prisma.deletionAnalysis.findMany({
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
    const totalDeletions = analyses.length;
    
    // Group by reason
    const reasonCounts: Record<string, number> = {};
    analyses.forEach((a) => {
      reasonCounts[a.likelyReason] = (reasonCounts[a.likelyReason] || 0) + 1;
    });

    // Group by subreddit
    const subredditStats: Record<string, { count: number; avgConfidence: number; reasons: string[] }> = {};
    analyses.forEach((a) => {
      if (!subredditStats[a.subreddit]) {
        subredditStats[a.subreddit] = { count: 0, avgConfidence: 0, reasons: [] };
      }
      subredditStats[a.subreddit].count++;
      subredditStats[a.subreddit].avgConfidence += a.confidence;
      subredditStats[a.subreddit].reasons.push(a.likelyReason);
    });

    Object.keys(subredditStats).forEach((sub) => {
      subredditStats[sub].avgConfidence /= subredditStats[sub].count;
    });

    // Aggregate all recommendations
    const allRecommendations: string[] = [];
    const recommendationCounts: Record<string, number> = {};
    
    analyses.forEach((a) => {
      if (a.recommendations) {
        try {
          const recs = JSON.parse(a.recommendations);
          recs.forEach((rec: string) => {
            recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1;
            if (!allRecommendations.includes(rec)) {
              allRecommendations.push(rec);
            }
          });
        } catch {}
      }
    });

    // Sort recommendations by frequency
    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([rec, count]) => ({ recommendation: rec, frequency: count }));

    // Calculate average time to deletion
    const avgHoursToDelete = analyses.length > 0
      ? analyses.reduce((sum, a) => sum + a.hoursUntilDeletion, 0) / analyses.length
      : 0;

    return c.json({
      totalDeletions,
      reasonBreakdown: reasonCounts,
      subredditStats,
      topRecommendations,
      avgHoursToDelete,
      recentAnalyses: analyses.slice(0, 10).map((a) => ({
        id: a.id,
        subreddit: a.subreddit,
        reason: a.likelyReason,
        confidence: a.confidence,
        hoursUntilDeletion: a.hoursUntilDeletion,
        createdAt: a.createdAt,
        clientName: a.opportunity.client.name,
        opportunityType: a.opportunity.opportunityType || 'primary',
      })),
    });
  } catch (error) {
    console.error("GET /api/deletion-analysis/insights error:", error);
    return c.json({ error: "Failed to fetch insights" }, 500);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

// GET /api/deletion-analysis/recommendations
app.get("/recommendations", async (c) => {
  const prisma = createPrismaClient();

  try {
    const analyses = await prisma.deletionAnalysis.findMany({
      where: {
        confidence: { gte: 0.7 }, // Only high-confidence analyses
      },
      orderBy: { createdAt: "desc" },
    });

    // Aggregate patterns and recommendations
    const patternFrequency: Record<string, number> = {};
    const recommendationFrequency: Record<string, number> = {};

    analyses.forEach((a) => {
      if (a.patterns) {
        try {
          const patterns = JSON.parse(a.patterns);
          patterns.forEach((p: string) => {
            patternFrequency[p] = (patternFrequency[p] || 0) + 1;
          });
        } catch {}
      }

      if (a.recommendations) {
        try {
          const recs = JSON.parse(a.recommendations);
          recs.forEach((r: string) => {
            recommendationFrequency[r] = (recommendationFrequency[r] || 0) + 1;
          });
        } catch {}
      }
    });

    // Generate AI instruction suggestions
    const topPatterns = Object.entries(patternFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([pattern]) => pattern);

    const topRecommendations = Object.entries(recommendationFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([rec]) => rec);

    // Generate suggested instruction text
    const suggestedInstructions = `Based on deletion pattern analysis:

${topRecommendations.map((rec, i) => `${i + 1}. ${rec}`).join("\n")}

Common patterns to avoid:
${topPatterns.map((pattern, i) => `- ${pattern}`).join("\n")}`;

    return c.json({
      topPatterns,
      topRecommendations,
      suggestedInstructions,
      analysisCount: analyses.length,
    });
  } catch (error) {
    console.error("GET /api/deletion-analysis/recommendations error:", error);
    return c.json({ error: "Failed to generate recommendations" }, 500);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
});

export default app;
