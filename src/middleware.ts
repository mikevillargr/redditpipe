import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Protect all other API routes
  if (pathname.startsWith("/api/")) {
    // Allow internal requests (cron jobs calling from localhost)
    const host = request.headers.get("host") || "";
    if (host.startsWith("localhost:") || host.startsWith("127.0.0.1:")) {
      return NextResponse.next();
    }

    const token = request.cookies.get("rp_session")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
