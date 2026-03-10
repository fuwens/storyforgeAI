import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, disabled: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; disabled?: boolean };
  if (!body.userId || typeof body.disabled !== "boolean") {
    return NextResponse.json({ error: "userId and disabled are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.role === "admin") {
    return NextResponse.json({ error: "Cannot disable admin users" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: body.userId },
    data: { disabled: body.disabled },
    select: { id: true, email: true, role: true, disabled: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
