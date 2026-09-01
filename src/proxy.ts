import { NextResponse, type NextRequest } from "next/server";
import { CSRF_COOKIE, generateCsrfToken } from "@/lib/csrf";

/**
 * Issues the CSRF token cookie on first visit.
 *
 * Cookies cannot be written while rendering a server component, so the token is
 * minted here and made visible to the current render by rewriting the inbound
 * cookie header.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(CSRF_COOKIE)?.value;
  if (existing) return NextResponse.next();

  const token = generateCsrfToken();

  request.cookies.set(CSRF_COOKIE, token);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("cookie", request.cookies.toString());

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
