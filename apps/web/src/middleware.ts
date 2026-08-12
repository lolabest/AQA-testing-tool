import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readIngressToken, sanitizeNextPath } from "@/lib/session-cookie";

/**
 * Cloud Agent port ingress strips Cookie headers before they reach the app,
 * so middleware cannot rely on session cookies. Auth is enforced client-side
 * via sessionStorage + Authorization on /api/proxy.
 */
export function middleware(request: NextRequest) {
  const ingress = readIngressToken(request);
  if (!ingress) return NextResponse.next();

  // Keep ingress tokens on navigations that would otherwise drop them.
  if (
    request.nextUrl.pathname === "/sign-in" &&
    !request.nextUrl.searchParams.has("_ingress_token")
  ) {
    const url = request.nextUrl.clone();
    url.searchParams.set("_ingress_token", ingress);
    const next = request.nextUrl.searchParams.get("next");
    if (next) url.searchParams.set("next", sanitizeNextPath(next, ingress));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
