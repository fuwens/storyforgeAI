import { persistMockAsset, persistRemoteAsset } from "@/lib/assets/persist";
import { addTask, findTask, getProject, updateTask } from "@/lib/db/store";
import { submitImageTask } from "@/lib/toapis/image-client";
import { submitVideoTask } from "@/lib/toapis/video-client";
import { getImageTaskStatus } from "@/lib/toapis/image-client";
import { getVideoTaskStatus } from "@/lib/toapis/video-client";
import type { Asset, GenerationTask } from "@/lib/types";
import { uid } from "@/lib/utils";

export async function syncProjectTasks(projectId: string) {
  const project = await getProject(projectId);
  if (!project) return null;

  for (const shot of project.shots) {
    for (const task of shot.tasks) {
      if (task.status === "completed" || task.status === "failed") continue;
      await syncTask(task);
    }
  }

  return getProject(projectId);
}

export async function retryTask(taskId: string) {
  const match = await findTask(taskId);
  if (!match) return null;

  const { shot, task } = match;
  const prompt = String(task.requestPayload.prompt || shot.sceneDescription);

  const submission =
    task.mediaType === "image"
      ? await submitImageTask({
          model: task.model,
          prompt,
          aspectRatio: shot.aspectRatio,
        })
      : await submitVideoTask({
          model: task.model,
          prompt,
          aspectRatio: shot.aspectRatio,
          duration: shot.durationSeconds,
          modelConfig: shot.modelConfig,
        });

  const now = new Date().toISOString();
  const newTask: GenerationTask = {
    id: uid("task"),
    shotId: shot.id,
    provider: submission.provider,
    providerTaskId: submission.providerTaskId,
    mediaType: task.mediaType,
    model: task.model,
    requestPayload: task.requestPayload,
    status: submission.status,
    createdAt: now,
    updatedAt: now,
  };

  await addTask(shot.projectId, shot.id, newTask);
  return true;
}

async function syncTask(task: GenerationTask) {
  if (task.provider === "mock") {
    await syncMockTask(task);
    return;
  }

  try {
    const statusPayload =
      task.mediaType === "image"
        ? await getImageTaskStatus(task.providerTaskId)
        : await getVideoTaskStatus(task.providerTaskId);

    const status = String(statusPayload.status || "failed") as GenerationTask["status"];
    if (status === "queued" || status === "in_progress") {
      await updateTask(task.id, { status });
      return;
    }

    if (status === "failed") {
      const errorMessage = String(
        ((statusPayload as Record<string, unknown>).error as { message?: string } | undefined)?.message || "Generation failed",
      );
      await updateTask(task.id, { status, errorMessage });
      return;
    }

    const payload = statusPayload as Record<string, unknown>;
    const result = payload.result as { data?: Array<{ url?: string }> } | undefined;
    const remoteUrl = result?.data?.[0]?.url;
    if (!remoteUrl) {
      await updateTask(task.id, { status: "failed", errorMessage: "Missing result URL" });
      return;
    }

    const persisted = await persistRemoteAsset(remoteUrl, task.mediaType);
    const asset = buildAsset(task, persisted.sourceUrl, persisted.storageUrl, persisted.mimeType);

    await updateTask(
      task.id,
      {
        status: "completed",
        sourceUrl: persisted.sourceUrl,
        storageUrl: persisted.storageUrl,
        expiresAt: payload.expires_at
          ? new Date(Number(payload.expires_at) * 1000).toISOString()
          : undefined,
      },
      asset,
    );
  } catch (error) {
    await updateTask(task.id, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error during sync",
    });
  }
}

async function syncMockTask(task: GenerationTask) {
  const createdAt = new Date(task.createdAt).getTime();
  const elapsed = Date.now() - createdAt;
  const completionMs = task.mediaType === "image" ? 2000 : 6000;

  if (elapsed < completionMs / 2) {
    await updateTask(task.id, { status: "queued" });
    return;
  }

  if (elapsed < completionMs) {
    await updateTask(task.id, { status: "in_progress" });
    return;
  }

  const prompt = String(task.requestPayload.prompt || "Mock asset");
  const persisted = await persistMockAsset(prompt, task.mediaType, task.model);
  const asset = buildAsset(task, persisted.sourceUrl, persisted.storageUrl, persisted.mimeType);
  await updateTask(
    task.id,
    {
      status: "completed",
      sourceUrl: persisted.sourceUrl,
      storageUrl: persisted.storageUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    asset,
  );
}

function buildAsset(task: GenerationTask, sourceUrl: string, storageUrl: string | undefined, mimeType: string): Asset {
  const now = new Date().toISOString();
  return {
    id: uid("asset"),
    shotId: task.shotId,
    sourceUrl,
    storageUrl,
    mimeType,
    approved: false,
    createdAt: now,
    updatedAt: now,
  };
}
