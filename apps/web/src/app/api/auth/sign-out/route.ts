import { NextResponse } from "next/server";

export async function POST() {
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
