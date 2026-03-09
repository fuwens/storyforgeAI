import { NextResponse } from "next/server";

import { getProject, saveScriptVersion } from "@/lib/db/store";
import { generateScript } from "@/lib/toapis/text-client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const script = await generateScript({
    topic: project.topic,
    targetDuration: project.targetDuration,
    language: project.language,
    styleTags: project.styleTags,
    platform: project.platform,
  });

  await saveScriptVersion(project.id, script);
  const refreshed = await getProject(project.id);
  return NextResponse.json(refreshed);
}
