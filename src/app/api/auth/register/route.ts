import { NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { uid } from "@/lib/utils";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    inviteCode?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const inviteCode = body.inviteCode?.trim();

  if (!email || !password || !inviteCode) {
    return NextResponse.json(
      { error: "邮箱、密码和邀请码不能为空" },
      { status: 400 },
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "密码长度至少 6 位" },
      { status: 400 },
    );
  }

  // Verify invite code
  const invite = await prisma.inviteCode.findUnique({
    where: { code: inviteCode },
  });

  if (!invite) {
    return NextResponse.json({ error: "邀请码无效" }, { status: 400 });
  }

  if (invite.usedBy) {
    return NextResponse.json({ error: "邀请码已被使用" }, { status: 400 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "邀请码已过期" }, { status: 400 });
  }

  // Check email uniqueness
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
  }

  const userId = uid("user");
  const passwordHash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        email,
        passwordHash,
        role: "user",
      },
    }),
    prisma.inviteCode.update({
      where: { id: invite.id },
      data: { usedBy: userId, usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
