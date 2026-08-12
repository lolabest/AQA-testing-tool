import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  SESSION_COOKIE,
  readIngressToken,
  sanitizeNextPath,
} from "@/lib/session-cookie";

export function middleware(request: NextRequest) {
  const signedIn = request.cookies.has(SESSION_COOKIE);
  const isSignIn = request.nextUrl.pathname === "/sign-in";
  const ingress = readIngressToken(request);

  if (!signedIn && !isSignIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    url.searchParams.set(
      "next",
      sanitizeNextPath(`${request.nextUrl.pathname}${request.nextUrl.search}`),
    );
    if (ingress) url.searchParams.set("_ingress_token", ingress);
    return NextResponse.redirect(url);
  }

  if (signedIn && isSignIn) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = sanitizeNextPath(nextParam, ingress);
    return NextResponse.redirect(new URL(destination, request.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
