import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/api/validations"];

const requiresAuth = (pathname: string) =>
  PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const unauthorized = () =>
  new NextResponse("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Internal Dashboard"',
    },
  });

const withSecurityHeaders = (response: NextResponse) => {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none';");
  return response;
};

export function proxy(request: NextRequest) {
  if (requiresAuth(request.nextUrl.pathname)) {
    const user = process.env.DASHBOARD_BASIC_AUTH_USER;
    const pass = process.env.DASHBOARD_BASIC_AUTH_PASS;
    if (!user || !pass) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Dashboard auth environment is missing." },
          { status: 500 },
        ),
      );
    }

    const authHeader = request.headers.get("authorization");
    const expected = `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;
    if (!authHeader || authHeader !== expected) {
      return withSecurityHeaders(unauthorized());
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/validations/:path*"],
};
