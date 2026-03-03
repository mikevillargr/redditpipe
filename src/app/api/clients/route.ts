import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { opportunities: true },
        },
      },
    });

    return NextResponse.json(clients);
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, websiteUrl, description, keywords, mentionTerms, status } =
      body;

    if (!name || !websiteUrl || !description || !keywords) {
      return NextResponse.json(
        { error: "Missing required fields: name, websiteUrl, description, keywords" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        websiteUrl,
        description,
        keywords: typeof keywords === "string" ? keywords : keywords.join(", "),
        mentionTerms:
          mentionTerms != null
            ? typeof mentionTerms === "string"
              ? mentionTerms
              : mentionTerms.join(", ")
            : null,
        status: status || "active",
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
