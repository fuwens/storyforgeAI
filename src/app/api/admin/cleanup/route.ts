import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { cleanupGenerated } from "@/lib/cleanup/cleanup-generated";

export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await cleanupGenerated();
  return NextResponse.json(result);
}
