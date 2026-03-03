import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.redditAccount.findMany({
      orderBy: [{ status: "asc" }, { username: "asc" }],
      include: {
        accountAssignments: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { opportunities: true },
        },
      },
    });

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("GET /api/accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      username,
      password,
      personalitySummary,
      writingStyleNotes,
      sampleComments,
      activeSubreddits,
      location,
      status,
      maxPostsPerDay,
      minHoursBetweenPosts,
    } = body;

    if (!username) {
      return NextResponse.json(
        { error: "Missing required field: username" },
        { status: 400 }
      );
    }

    const account = await prisma.redditAccount.create({
      data: {
        username,
        password: password || null,
        personalitySummary: personalitySummary || null,
        writingStyleNotes: writingStyleNotes || null,
        sampleComments: sampleComments || null,
        activeSubreddits: activeSubreddits || null,
        location: location || null,
        status: status || "warming",
        maxPostsPerDay: maxPostsPerDay ?? 3,
        minHoursBetweenPosts: minHoursBetweenPosts ?? 4,
        organicPostsWeek: 0,
        citationPostsWeek: 0,
        postsTodayCount: 0,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("POST /api/accounts error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
