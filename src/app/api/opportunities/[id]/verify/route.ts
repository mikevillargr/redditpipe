import { NextRequest, NextResponse } from "next/server";
import { markAsPublished } from "@/lib/verification";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await markAsPublished(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/opportunities/[id]/verify error:", error);
    return NextResponse.json(
      {
        error: "Verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
