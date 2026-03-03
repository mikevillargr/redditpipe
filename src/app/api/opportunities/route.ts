import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const status = searchParams.get("status");
    const minScore = searchParams.get("minScore");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (clientId && clientId !== "all") {
      where.clientId = clientId;
    }
    if (status && status !== "all") {
      where.status = status;
    }
    if (minScore) {
      where.relevanceScore = { gte: parseFloat(minScore) };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          endDate + "T23:59:59.999Z"
        );
      }
    }

    const opportunities = await prisma.opportunity.findMany({
      where,
      orderBy: { relevanceScore: "desc" },
      include: {
        client: {
          select: { id: true, name: true },
        },
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

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("GET /api/opportunities error:", error);
    return NextResponse.json(
      { error: "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}
