import { NextResponse } from "next/server";

import { getProject, replaceShots } from "@/lib/db/store";
import { generatePrompts } from "@/lib/toapis/text-client";
import { uid } from "@/lib/utils";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await getProject(id);
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
  const refreshed = await getProject(project.id);
  return NextResponse.json(refreshed);
}
