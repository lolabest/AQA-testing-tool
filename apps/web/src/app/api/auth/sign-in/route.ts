import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";

type AuthPayload = {
  token?: string;
  accessToken?: string;
  expiresIn?: number;
  data?: {
    token?: string;
    accessToken?: string;
    expiresIn?: number;
  };
  [key: string]: unknown;
};

export async function POST(request: Request) {
  let credentials: unknown;
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid sign-in request." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/sign-in`, {
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

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set("testpilot_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: payload.expiresIn ?? payload.data?.expiresIn ?? 60 * 60 * 8,
    });
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
