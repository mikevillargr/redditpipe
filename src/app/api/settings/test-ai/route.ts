import { NextRequest, NextResponse } from "next/server";
import { clearApiKeyCache, testConnection } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    // Clear cache so it picks up any newly saved key
    clearApiKeyCache();

    // Accept key from body so test works before saving
    let apiKey: string | undefined;
    try {
      const body = await request.json();
      if (body.apiKey && typeof body.apiKey === "string" && !body.apiKey.startsWith("****")) {
        apiKey = body.apiKey;
      }
    } catch {
      // No body is fine — will read from DB
    }

    const result = await testConnection(apiKey);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
