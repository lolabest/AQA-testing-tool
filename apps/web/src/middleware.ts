import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function withIngressToken(from: URL, to: URL) {
  const ingress = from.searchParams.get("_ingress_token");
  if (ingress && !to.searchParams.has("_ingress_token")) {
    to.searchParams.set("_ingress_token", ingress);
  }
  return to;
}

export function middleware(request: NextRequest) {
  const signedIn = request.cookies.has("testpilot_token");
  const isSignIn = request.nextUrl.pathname === "/sign-in";

  if (!signedIn && !isSignIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    const nextTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    url.searchParams.set("next", nextTarget);
    withIngressToken(request.nextUrl, url);
    return NextResponse.redirect(url);
  }

  if (signedIn && isSignIn) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    if (nextParam?.startsWith("/")) {
      const target = new URL(nextParam, request.nextUrl.origin);
      url.pathname = target.pathname;
      url.search = target.search;
    } else {
      url.pathname = "/";
      url.search = "";
    }
    withIngressToken(request.nextUrl, url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
