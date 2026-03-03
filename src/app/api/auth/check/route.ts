import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("rp_session")?.value;
  const validToken = (globalThis as Record<string, unknown>).__rp_session_token as string | undefined;

  if (!token || !validToken || token !== validToken) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true });
}
