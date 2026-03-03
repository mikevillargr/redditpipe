import { NextResponse } from "next/server";
import { clearApiKeyCache, testConnection } from "@/lib/ai";

export async function POST() {
  try {
    // Clear cache so it picks up any newly saved key
    clearApiKeyCache();

    const result = await testConnection();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
