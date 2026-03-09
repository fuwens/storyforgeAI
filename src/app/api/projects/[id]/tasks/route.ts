import { NextResponse } from "next/server";

import { addTask, getProject, updateTask } from "@/lib/db/store";
import { syncProjectTasks } from "@/lib/tasks/task-runner";
import { persistRemoteAsset } from "@/lib/assets/persist";
import { submitImageTask } from "@/lib/toapis/image-client";
import { submitVideoTask } from "@/lib/toapis/video-client";
import type { Asset, GenerationTask } from "@/lib/types";
import { uid } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const project = await syncProjectTasks(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

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

  for (const shot of project.shots) {
    const prompts = shot.promptVariants[0];
    const prompt =
      shot.generationType === "image"
        ? prompts?.imagePrompt || shot.sceneDescription
        : prompts?.videoPrompt || shot.sceneDescription;

    try {
      if (shot.generationType === "image") {
        const submission = await submitImageTask({
          model: shot.model || "gpt-4o-image",
          prompt,
          negativePrompt: prompts?.negativePrompt,
          aspectRatio: shot.aspectRatio,
        });

        const task: GenerationTask = {
          id: uid("task"),
          shotId: shot.id,
          provider: submission.provider,
          providerTaskId: submission.providerTaskId,
          mediaType: "image",
          model: shot.model || "gpt-4o-image",
          requestPayload: { prompt, negativePrompt: prompts?.negativePrompt, aspectRatio: shot.aspectRatio },
          status: submission.status,
          createdAt: now,
          updatedAt: now,
        };

        await addTask(project.id, shot.id, task);

        // 图像是同步的，立刻持久化 asset
        if (submission.status === "completed" && submission.resultUrl) {
          const persisted = await persistRemoteAsset(submission.resultUrl, "image");
          const asset: Asset = {
            id: uid("asset"),
            shotId: shot.id,
            sourceUrl: persisted.sourceUrl,
            storageUrl: persisted.storageUrl,
            mimeType: persisted.mimeType,
            approved: false,
            createdAt: now,
            updatedAt: now,
          };
          await updateTask(task.id, { status: "completed", sourceUrl: persisted.sourceUrl, storageUrl: persisted.storageUrl }, asset);
        }
      } else {
        const submission = await submitVideoTask({
          model: shot.model || "kling-2-6",
          prompt,
          aspectRatio: shot.aspectRatio,
          duration: shot.durationSeconds,
          modelConfig: shot.modelConfig,
        });

        const task: GenerationTask = {
          id: uid("task"),
          shotId: shot.id,
          provider: submission.provider,
          providerTaskId: submission.providerTaskId,
          mediaType: "video",
          model: shot.model || "kling-2-6",
          requestPayload: { prompt, aspectRatio: shot.aspectRatio, duration: shot.durationSeconds, modelConfig: shot.modelConfig },
          status: submission.status,
          createdAt: now,
          updatedAt: now,
        };

        await addTask(project.id, shot.id, task);
      }
    } catch (err) {
      console.error(`Shot ${shot.id} task submission failed:`, err);
    }
  }

  const refreshed = await syncProjectTasks(project.id);
  return NextResponse.json(refreshed);
}
