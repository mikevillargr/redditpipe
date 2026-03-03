import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rewriteReply, generateReplyDraft } from "@/lib/ai";

const VALID_ACTIONS = ["generate", "regenerate", "shorter", "casual", "formal"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, userPrompt } = body;

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be: ${VALID_ACTIONS.join(", ")}` },
        { status: 400 }
      );
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            username: true,
            personalitySummary: true,
            writingStyleNotes: true,
            sampleComments: true,
          },
        },
        client: {
          select: {
            name: true,
            websiteUrl: true,
            description: true,
            mentionTerms: true,
          },
        },
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    let newDraft: string;

    if (action === "generate" || (!opportunity.aiDraftReply && action === "regenerate")) {
      // Generate from scratch using full thread context
      newDraft = await generateReplyDraft({
        threadTitle: opportunity.title,
        threadBody: opportunity.bodySnippet || "",
        topComments: opportunity.topComments || "",
        subreddit: opportunity.subreddit,
        clientName: opportunity.client?.name || "the product",
        clientUrl: opportunity.client?.websiteUrl || "",
        clientDescription: opportunity.client?.description || "",
        clientMentionTerms: opportunity.client?.mentionTerms || "",
        accountUsername: opportunity.account?.username,
        accountPersonality: opportunity.account?.personalitySummary || undefined,
        accountStyleNotes: opportunity.account?.writingStyleNotes || undefined,
        accountSampleComments: opportunity.account?.sampleComments || undefined,
      });
    } else if (!opportunity.aiDraftReply) {
      return NextResponse.json(
        { error: "No existing draft to modify. Use 'generate' first." },
        { status: 400 }
      );
    } else {
      // Rewrite existing draft
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

    // Save the draft
    await prisma.opportunity.update({
      where: { id },
      data: { aiDraftReply: newDraft },
    });

    return NextResponse.json({ aiDraftReply: newDraft });
  } catch (error) {
    console.error("POST /api/opportunities/[id]/rewrite error:", error);
    return NextResponse.json(
      {
        error: "Rewrite failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
