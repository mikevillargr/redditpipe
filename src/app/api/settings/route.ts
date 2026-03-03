import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return "****" + value.slice(-4);
}

export async function GET() {
  try {
    let settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "singleton" },
      });
    }

    // Mask secrets
    return NextResponse.json({
      ...settings,
      redditClientId: maskSecret(settings.redditClientId),
      redditClientSecret: maskSecret(settings.redditClientSecret),
      redditPassword: maskSecret(settings.redditPassword),
      anthropicApiKey: maskSecret(settings.anthropicApiKey),
    });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Filter out masked values (don't overwrite secrets with masked strings)
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && value.startsWith("****")) {
        continue; // Skip masked values
      }
      data[key] = value;
    }

    // Remove id if present
    delete data.id;

    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    // Return with masked secrets
    return NextResponse.json({
      ...settings,
      redditClientId: maskSecret(settings.redditClientId),
      redditClientSecret: maskSecret(settings.redditClientSecret),
      redditPassword: maskSecret(settings.redditPassword),
      anthropicApiKey: maskSecret(settings.anthropicApiKey),
    });
  } catch (error) {
    console.error("PUT /api/settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
