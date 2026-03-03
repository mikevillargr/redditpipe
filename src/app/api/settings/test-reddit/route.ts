import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedditAccessToken } from "@/lib/reddit";

export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });

    const clientId =
      settings?.redditClientId || process.env.REDDIT_CLIENT_ID;
    const clientSecret =
      settings?.redditClientSecret || process.env.REDDIT_CLIENT_SECRET;
    const username =
      settings?.redditUsername || process.env.REDDIT_USERNAME;
    const password =
      settings?.redditPassword || process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Reddit API credentials not configured",
        },
        { status: 400 }
      );
    }

    await getRedditAccessToken(clientId, clientSecret, username, password);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
