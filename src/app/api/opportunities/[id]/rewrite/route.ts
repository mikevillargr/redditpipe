import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rewriteReply } from "@/lib/ai";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !["regenerate", "shorter", "casual", "formal"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be: regenerate, shorter, casual, or formal" },
        { status: 400 }
      );
    }

    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            personalitySummary: true,
          },
        },
        client: {
          select: {
            name: true,
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

    if (!opportunity.aiDraftReply) {
      return NextResponse.json(
        { error: "No existing draft to rewrite" },
        { status: 400 }
      );
    }

    const newDraft = await rewriteReply(
      opportunity.aiDraftReply,
      action as "regenerate" | "shorter" | "casual" | "formal",
      {
        accountPersonality: opportunity.account?.personalitySummary || undefined,
        clientName: opportunity.client?.name || undefined,
      }
    );

    // Save the rewritten draft
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
