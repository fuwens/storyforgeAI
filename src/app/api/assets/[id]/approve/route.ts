import { NextResponse } from "next/server";

import { approveAsset, getProjectByAsset } from "@/lib/db/store";

export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const asset = await approveAsset(id);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  const project = await getProjectByAsset(id);
  return NextResponse.json(project);
}
