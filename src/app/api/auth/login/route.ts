import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSessionToken,
  getSessionCookieName,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  if (user.disabled) {
    return NextResponse.json({ error: "账号已被禁用" }, { status: 403 });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
  }

  const store = await cookies();
  store.set(
    getSessionCookieName(),
    createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    }),
    {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    },
  );

  return NextResponse.json({
    ok: true,
    redirect: user.role === "admin" ? "/admin" : "/projects",
  });
}
