import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getProject, replaceShots } from "@/lib/db/store";
import { generatePrompts } from "@/lib/toapis/text-client";
import { uid } from "@/lib/utils";

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

  const now = new Date().toISOString();
  const shots = await Promise.all(
    project.shots.map(async (shot) => {
      const prompts = await generatePrompts({
        sceneDescription: shot.sceneDescription,
        emotion: shot.emotion,
        shotType: shot.shotType,
        styleTags: project.styleTags,
      });

      return {
        ...shot,
        updatedAt: now,
        promptVariants: [
          {
            id: uid("prompt"),
            imagePrompt: prompts.image_prompt,
            videoPrompt: prompts.video_prompt,
            negativePrompt: prompts.negative_prompt,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
      };
    }),
  );

  await replaceShots(project.id, shots);
  const refreshed = await getProject(project.id, session.userId);
  return NextResponse.json(refreshed);
}
