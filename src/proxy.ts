import { NextRequest, NextResponse } from "next/server";

declare const process: { env: Record<string, string | undefined> };

const PUBLIC_PATHS = ["/api/validation-result-webhook", "/login", "/api/auth/login", "/api/dashboard-data"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const withSecurityHeaders = (response: NextResponse) => {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'none';");
  return response;
};

export function proxy(request: NextRequest) {
  // Allow public paths
  if (isPublicPath(request.nextUrl.pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  // Auth is handled client-side via localStorage redirect
  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
