import { NextRequest, NextResponse } from "next/server";

declare const process: { env: Record<string, string | undefined> };

const PUBLIC_PATHS = ["/api/validation-result-webhook"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

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

const decodeBase64 = (value: string) => {
  const globalBuffer = (globalThis as { Buffer?: any }).Buffer;
  if (globalBuffer?.from) return globalBuffer.from(value, "base64").toString("utf8");
  return atob(value);
};

const parseBasicAuth = (authHeader: string | null) => {
  if (!authHeader) return null;
  const match = authHeader.match(/^Basic\s+(.+)$/i);
  if (!match) return null;
  const decoded = decodeBase64(match[1]);
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return null;
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
};

export function proxy(request: NextRequest) {
  if (isPublicPath(request.nextUrl.pathname)) return withSecurityHeaders(NextResponse.next());

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

  const parsed = parseBasicAuth(request.headers.get("authorization"));
  if (!parsed || parsed.username !== user || parsed.password !== pass) {
    return withSecurityHeaders(unauthorized());
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/:path*"],
};
