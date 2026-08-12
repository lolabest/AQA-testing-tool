import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const forwardedResponseHeaders = [
  "content-type",
  "cache-control",
  "content-disposition",
  "x-request-id",
] as const;

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const headerAuth = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("access_token");
  const target = new URL(path.map(encodeURIComponent).join("/"), `${API_BASE_URL}/`);
  // Do not forward the browser access_token query to the API.
  const upstreamSearch = new URLSearchParams(request.nextUrl.search);
  upstreamSearch.delete("access_token");
  target.search = upstreamSearch.toString();

  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") ?? "application/json");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);

  if (headerAuth) {
    headers.set("authorization", headerAuth);
  } else if (queryToken) {
    headers.set("authorization", `Bearer ${queryToken}`);
  } else if (cookieToken) {
    headers.set("authorization", `Bearer ${cookieToken}`);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const response = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  for (const name of forwardedResponseHeaders) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
