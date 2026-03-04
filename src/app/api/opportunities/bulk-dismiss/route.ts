import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, reason } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: ids (array of opportunity IDs)" },
        { status: 400 }
      );
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: "Dismissal reason is required" },
        { status: 400 }
      );
    }

    // Fetch opportunities for logging
    const opps = await prisma.opportunity.findMany({
      where: { id: { in: ids } },
      include: { client: { select: { id: true, name: true } } },
    });

    // Log each dismissal for pattern analysis
    if (opps.length > 0) {
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
    }

    // Hard delete
    const result = await prisma.opportunity.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("POST /api/opportunities/bulk-dismiss error:", error);
    return NextResponse.json(
      { error: "Failed to bulk dismiss" },
      { status: 500 }
    );
  }
}
