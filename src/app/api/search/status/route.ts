import { NextResponse } from "next/server";
import { getPipelineStatus } from "@/lib/search-pipeline";

export async function GET() {
  return NextResponse.json(getPipelineStatus());
}
