import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { uid } from "@/lib/utils";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    count?: number;
    expiresAt?: string;
  };
  const count = Math.min(Math.max(body.count || 1, 1), 100);
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const code = generateCode();
    await prisma.inviteCode.create({
      data: {
        id: uid("inv"),
        code,
        expiresAt,
      },
    });
    codes.push(code);
  }

  return NextResponse.json({ codes });
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const inviteCodes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(inviteCodes);
}
