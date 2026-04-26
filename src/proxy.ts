import { NextResponse, type NextRequest } from "next/server";

// Scoped to /diagnostics/* so it cannot affect the rest of the app.
// The diagnostics test reads x-diagnostics-middleware to confirm the proxy
// actually executed for the request.
// (Next 16 renamed the `middleware` convention to `proxy`.)
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-diagnostics-middleware", "1");
  response.headers.set("x-diagnostics-middleware-stamp", new Date().toISOString());
  response.headers.set("x-diagnostics-middleware-path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/diagnostics/:path*", "/api/diagnostics/:path*"],
};
