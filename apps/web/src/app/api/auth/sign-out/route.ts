import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";

export async function POST() {
  const token = (await cookies()).get("testpilot_token")?.value;
  if (token) {
    await fetch(`${API_BASE_URL}/api/v1/auth/sign-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set("testpilot_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
