import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action, dismissReason } = body as {
      ids: string[];
      action: "publish" | "dismiss";
      dismissReason?: string;
    };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    if (!["publish", "dismiss"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (action === "dismiss") {
      if (!dismissReason || !dismissReason.trim()) {
        return NextResponse.json({ error: "Dismissal reason is required" }, { status: 400 });
      }

      // Fetch opportunities for logging before deletion
      const opps = await prisma.opportunity.findMany({
        where: { id: { in: ids } },
        include: { client: { select: { id: true, name: true } } },
      });

      // Log each dismissal for pattern analysis
      for (const opp of opps) {
        await prisma.dismissalLog.create({
          data: {
            clientId: opp.clientId,
            clientName: opp.client?.name || "Unknown",
            threadId: opp.threadId,
            subreddit: opp.subreddit,
            title: opp.title,
            relevanceScore: opp.relevanceScore,
            reason: dismissReason.trim(),
          },
        });
      }

      // Hard delete
      await prisma.opportunity.deleteMany({ where: { id: { in: ids } } });

      return NextResponse.json({ success: true, count: opps.length, action: "dismissed" });
    }

    // Publish
    await prisma.opportunity.updateMany({
      where: { id: { in: ids } },
      data: { status: "published" },
    });

    return NextResponse.json({ success: true, count: ids.length, action });
  } catch (error) {
    console.error("POST /api/opportunities/bulk error:", error);
    return NextResponse.json(
      { error: "Bulk action failed" },
      { status: 500 }
    );
  }
}
