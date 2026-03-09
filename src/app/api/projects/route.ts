import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { createProject, listProjects } from "@/lib/db/store";
import { getPreset } from "@/lib/toapis/config";
import type { CreateProjectInput } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const projects = await listProjects(session.userId);
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as Partial<CreateProjectInput>;
  const preset = getPreset(body.presetKey || "");
  const project = await createProject(
    {
      title: body.title || "Untitled Project",
      topic: body.topic || "",
      targetDuration: body.targetDuration || "60s",
      language: body.language || "English",
      platform: body.platform || "YouTube",
      presetKey: body.presetKey || preset.key,
      styleTags: body.styleTags?.length ? body.styleTags : preset.styleTags,
    },
    session.userId,
  );

  return NextResponse.json(project, { status: 201 });
}
