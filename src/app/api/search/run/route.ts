import { NextResponse } from "next/server";
import { getPipelineStatus } from "@/lib/search-pipeline";
import { runSearch } from "@/lib/cron";

export async function POST() {
  const status = getPipelineStatus();
  if (status.running) {
    return NextResponse.json(
      { error: "Search already running", phase: status.phase, progress: status.progress },
      { status: 409 }
    );
  }

  // Fire and forget — frontend polls /api/search/status
  runSearch().catch((err) => console.error("[API] Search failed:", err));

  return NextResponse.json({ message: "Search started", status: "running" });
}
