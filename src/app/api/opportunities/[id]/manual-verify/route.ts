import { NextRequest, NextResponse } from "next/server";
import { submitPermalink } from "@/lib/verification";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.permalinkUrl) {
      return NextResponse.json(
        { error: "Missing required field: permalinkUrl" },
        { status: 400 }
      );
    }

    const result = await submitPermalink(id, body.permalinkUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "POST /api/opportunities/[id]/manual-verify error:",
      error
    );
    return NextResponse.json(
      {
        error: "Manual verification failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
