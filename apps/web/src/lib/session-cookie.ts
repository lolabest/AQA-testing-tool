import type { NextRequest } from "next/server";

export const SESSION_COOKIE = "testpilot_token";

export function requestIsHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim().toLowerCase() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function sessionCookieOptions(request: Request, maxAge: number) {
  const secure = requestIsHttps(request);
  return {
    httpOnly: true as const,
    // Preview/ingress hosts are often HTTPS even in `next dev`.
    // Use SameSite=None on HTTPS so the session survives cross-site embeds.
    sameSite: (secure ? "none" : "lax") as "none" | "lax",
    secure,
    path: "/",
    maxAge,
  };
}

export function sanitizeNextPath(
  candidate: string | null | undefined,
  ingressToken?: string | null,
): string {
  let path = candidate?.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//")) {
    path = "/";
  }

  let url: URL;
  try {
    url = new URL(path, "http://testpilot.local");
  } catch {
    url = new URL("/", "http://testpilot.local");
  }

  if (
    url.pathname !== "/" &&
    (!/^\/[A-Za-z0-9._~/-]*$/.test(url.pathname) ||
      url.pathname.includes(":") ||
      url.pathname === "/sign-in" ||
      url.pathname.startsWith("/sign-in/"))
  ) {
    url.pathname = "/";
    url.search = "";
  }

  if (ingressToken && !url.searchParams.has("_ingress_token")) {
    url.searchParams.set("_ingress_token", ingressToken);
  }

  return `${url.pathname}${url.search}`;
}

export function readIngressToken(request: NextRequest | URL): string | null {
  const params =
    "nextUrl" in request ? request.nextUrl.searchParams : request.searchParams;
  return params.get("_ingress_token");
}
