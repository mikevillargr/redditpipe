import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const account = await prisma.redditAccount.findUnique({
      where: { id },
      include: {
        accountAssignments: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
        opportunities: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("GET /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle client assignments if provided
    if (body.clientIds) {
      const clientIds: string[] = body.clientIds;
      delete body.clientIds;

      // Delete existing assignments and create new ones
      await prisma.accountClientAssignment.deleteMany({
        where: { accountId: id },
      });

      if (clientIds.length > 0) {
        await prisma.accountClientAssignment.createMany({
          data: clientIds.map((clientId) => ({
            accountId: id,
            clientId,
          })),
        });
      }
    }

    const account = await prisma.redditAccount.update({
      where: { id },
      data: body,
      include: {
        accountAssignments: {
          include: {
            client: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json(account);
  } catch (error) {
    console.error("PUT /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update account" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.redditAccount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/accounts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
