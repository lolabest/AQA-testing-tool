import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";

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
  const token = (await cookies()).get("testpilot_token")?.value;
  const target = new URL(path.map(encodeURIComponent).join("/"), `${API_BASE_URL}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") ?? "application/json");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  if (token) headers.set("authorization", `Bearer ${token}`);

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
