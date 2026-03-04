import { NextResponse } from "next/server";
import { runSearchPipeline } from "@/lib/search-pipeline";

export async function POST() {
  try {
    const result = await runSearchPipeline();
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/search/run error:", error);
    return NextResponse.json(
      {
        error: "Search pipeline failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
