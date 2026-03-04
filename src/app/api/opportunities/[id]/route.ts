import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        client: true,
        account: true,
      },
    });

    if (!opportunity) {
      return NextResponse.json(
        { error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("GET /api/opportunities/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Dismiss = log pattern data + hard delete
    if (body.status === "dismissed") {
      if (!body.dismissReason || !body.dismissReason.trim()) {
        return NextResponse.json(
          { error: "Dismissal reason is required" },
          { status: 400 }
        );
      }

      const opp = await prisma.opportunity.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
      });
      if (!opp) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Log dismissal for pattern analysis
      await prisma.dismissalLog.create({
        data: {
          clientId: opp.clientId,
          clientName: opp.client?.name || "Unknown",
          threadId: opp.threadId,
          subreddit: opp.subreddit,
          title: opp.title,
          relevanceScore: opp.relevanceScore,
          reason: body.dismissReason.trim(),
        },
      });

      // Hard delete
      await prisma.opportunity.delete({ where: { id } });

      return NextResponse.json({ deleted: true, id });
    }

    // Normal update (non-dismiss)
    const allowedFields = ["aiDraftReply", "status", "accountId", "permalinkUrl"];
    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        data[key] = body[key];
      }
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        account: {
          select: {
            id: true,
            username: true,
            password: true,
            status: true,
            postsTodayCount: true,
            maxPostsPerDay: true,
            organicPostsWeek: true,
            citationPostsWeek: true,
          },
        },
      },
    });

    return NextResponse.json(opportunity);
  } catch (error) {
    console.error("PUT /api/opportunities/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update opportunity" },
      { status: 500 }
    );
  }
}
