import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getProject, replaceShots, saveScriptVersion } from "@/lib/db/store";
import { getPreset, imageModels } from "@/lib/toapis/config";
import type { Shot } from "@/lib/types";
import { generateStoryboard } from "@/lib/toapis/text-client";
import { uid } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { script?: string };
  const project = await getProject(id, session.userId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const script = body.script?.trim() || project.scriptVersions[0]?.content;
  if (!script) {
    return NextResponse.json({ error: "Script is required" }, { status: 400 });
  }
  if (script !== project.scriptVersions[0]?.content) {
    await saveScriptVersion(project.id, script);
  }

  const preset = getPreset(project.presetKey);
  const storyboard = await generateStoryboard(script);
  const now = new Date().toISOString();
  const shots: Shot[] = storyboard.map((item) => ({
    id: uid("shot"),
    projectId: project.id,
    sequence: item.sequence,
    title: `Shot ${item.sequence}`,
    narration: item.narration,
    sceneDescription: item.scene_description,
    emotion: item.emotion,
    shotType: item.shot_type,
    durationSeconds: item.duration,
    generationType: "image",
    model: preset.defaultImageModel,
    aspectRatio: imageModels[0].defaults.size,
    modelConfig: {},
    promptVariants: [],
    tasks: [],
    assets: [],
    createdAt: now,
    updatedAt: now,
  }));

  await replaceShots(project.id, shots);
  const refreshed = await getProject(project.id, session.userId);
  return NextResponse.json(refreshed);
}
