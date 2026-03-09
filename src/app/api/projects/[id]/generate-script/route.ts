import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getProject, saveScriptVersion } from "@/lib/db/store";
import { generateScript } from "@/lib/toapis/text-client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getProject(id, session.userId);
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
  const refreshed = await getProject(project.id, session.userId);
  return NextResponse.json(refreshed);
}
