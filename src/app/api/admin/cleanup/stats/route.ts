import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getGeneratedDirStats } from "@/lib/cleanup/cleanup-generated";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stats = await getGeneratedDirStats();
  return NextResponse.json(stats);
}
