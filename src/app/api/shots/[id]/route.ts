import { NextResponse } from "next/server";

import { updateShot } from "@/lib/db/store";
import type { Shot } from "@/lib/types";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Partial<Shot> & { projectId?: string };

  if (!body.projectId) {
    return NextResponse.json({ error: "projectId is required" }, { status: 400 });
  }

  const shot = await updateShot(body.projectId, id, {
    generationType: body.generationType,
    model: body.model,
    aspectRatio: body.aspectRatio,
    durationSeconds: body.durationSeconds,
    modelConfig: body.modelConfig,
    sceneDescription: body.sceneDescription,
    narration: body.narration,
  });

  if (!shot) {
    return NextResponse.json({ error: "Shot not found" }, { status: 404 });
  }

  return NextResponse.json(shot);
}
