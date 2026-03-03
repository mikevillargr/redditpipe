import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: ids (array of opportunity IDs)" },
        { status: 400 }
      );
    }

    const result = await prisma.opportunity.updateMany({
      where: { id: { in: ids } },
      data: { status: "dismissed" },
    });

    return NextResponse.json({ dismissed: result.count });
  } catch (error) {
    console.error("POST /api/opportunities/bulk-dismiss error:", error);
    return NextResponse.json(
      { error: "Failed to bulk dismiss" },
      { status: 500 }
    );
  }
}
