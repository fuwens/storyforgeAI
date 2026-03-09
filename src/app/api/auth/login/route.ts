import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSessionToken, getSessionCookieName } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (
    email !== (process.env.ADMIN_EMAIL || "admin@storyforge.local").toLowerCase() ||
    password !== (process.env.ADMIN_PASSWORD || "storyforge")
  ) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const store = await cookies();
  store.set(getSessionCookieName(), createSessionToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}
