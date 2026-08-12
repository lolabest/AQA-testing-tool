import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await fetch(`${API_BASE_URL}/api/v1/auth/sign-out`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SESSION_COOKIE, "", {
    ...sessionCookieOptions(request, 0),
    maxAge: 0,
  });
  return response;
}
