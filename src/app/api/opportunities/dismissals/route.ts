import { NextResponse } from "next/server";
import { analyzeDismissals } from "@/lib/ai-scoring";

export async function GET() {
  try {
    const analysis = await analyzeDismissals();
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("GET /api/opportunities/dismissals error:", error);
    return NextResponse.json(
      { error: "Failed to analyze dismissals" },
      { status: 500 }
    );
  }
}
