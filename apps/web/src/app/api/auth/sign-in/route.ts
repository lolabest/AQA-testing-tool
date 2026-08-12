import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";

type AuthPayload = {
  token?: string;
  accessToken?: string;
  expiresIn?: number;
  expiresAt?: string;
  data?: {
    token?: string;
    accessToken?: string;
    expiresIn?: number;
    expiresAt?: string;
  };
  [key: string]: unknown;
};

function resolveMaxAge(payload: AuthPayload): number {
  const explicit = payload.expiresIn ?? payload.data?.expiresIn;
  if (typeof explicit === "number" && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }

  const expiresAt = payload.expiresAt ?? payload.data?.expiresAt;
  if (typeof expiresAt === "string") {
    const ms = Date.parse(expiresAt) - Date.now();
    if (Number.isFinite(ms) && ms > 1000) {
      return Math.floor(ms / 1000);
    }
  }

  return 60 * 60 * 8;
}

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid sign-in request." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/api/v1/auth/sign-in`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });

    const payload = (await upstream.json().catch(() => ({
      message: "Authentication service returned an invalid response.",
    }))) as AuthPayload;

    if (!upstream.ok) {
      return NextResponse.json(payload, { status: upstream.status });
    }

    const token =
      payload.accessToken ??
      payload.token ??
      payload.data?.accessToken ??
      payload.data?.token;

    if (!token) {
      return NextResponse.json(
        { message: "Authentication service did not return an access token." },
        { status: 502 },
      );
    }

    // Return the token in the body: Cloud Agent ingress strips Cookie headers,
    // so the browser must persist the session in sessionStorage instead.
    const response = NextResponse.json({ authenticated: true, accessToken: token });
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(request, resolveMaxAge(payload)),
    );
    return response;
  } catch {
    return NextResponse.json(
      {
        message: `Could not reach the TestPilot API at ${API_BASE_URL}.`,
      },
      { status: 503 },
    );
  }
}
