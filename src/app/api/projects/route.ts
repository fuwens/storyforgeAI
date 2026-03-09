import { NextResponse } from "next/server";

import { createProject, listProjects } from "@/lib/db/store";
import { getPreset } from "@/lib/toapis/config";
import type { CreateProjectInput } from "@/lib/types";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<CreateProjectInput>;
  const preset = getPreset(body.presetKey || "");
  const project = await createProject({
    title: body.title || "Untitled Project",
    topic: body.topic || "",
    targetDuration: body.targetDuration || "60s",
    language: body.language || "English",
    platform: body.platform || "YouTube",
    presetKey: body.presetKey || preset.key,
    styleTags: body.styleTags?.length ? body.styleTags : preset.styleTags,
  });

  return NextResponse.json(project, { status: 201 });
}
