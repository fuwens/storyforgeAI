import { persistRemoteAsset } from "@/lib/assets/persist";
import { updateTask } from "@/lib/db/store";
import { submitImageTask } from "@/lib/toapis/image-client";
import { submitVideoTask } from "@/lib/toapis/video-client";
import type { Asset } from "@/lib/types";
import { uid } from "@/lib/utils";

export type GenerateMediaJobData = {
  taskId: string;
  shotId: string;
  projectId: string;
  mediaType: "image" | "video";
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  duration?: number;
  model: string;
  modelConfig?: Record<string, unknown>;
};

export async function generateMediaProcessor(
  data: GenerateMediaJobData,
): Promise<void> {
  const {
    taskId,
    shotId,
    projectId: _projectId,
    mediaType,
    prompt,
    negativePrompt,
    aspectRatio,
    duration,
    model,
    modelConfig,
  } = data;

  const now = new Date().toISOString();

  try {
    if (mediaType === "image") {
      const submission = await submitImageTask({
        model,
        prompt,
        negativePrompt,
        aspectRatio,
      });

      if (submission.status === "completed" && submission.resultUrl) {
        // Image returned synchronously — persist and mark completed
        const persisted = await persistRemoteAsset(submission.resultUrl, "image");
        const asset: Asset = {
          id: uid("asset"),
          shotId,
          sourceUrl: persisted.sourceUrl,
          storageUrl: persisted.storageUrl,
          mimeType: persisted.mimeType,
          approved: false,
          createdAt: now,
          updatedAt: now,
        };
        await updateTask(
          taskId,
          {
            status: "completed",
            provider: submission.provider,
            providerTaskId: submission.providerTaskId,
            sourceUrl: persisted.sourceUrl,
            storageUrl: persisted.storageUrl,
          },
          asset,
        );
      } else {
        // Queued state — update task with provider info, keep status as queued/in_progress
        await updateTask(taskId, {
          status: submission.status,
          provider: submission.provider,
          providerTaskId: submission.providerTaskId,
        });
      }
    } else {
      // Video generation — always async
      const submission = await submitVideoTask({
        model,
        prompt,
        aspectRatio,
        duration,
        modelConfig,
      });

      // Update task with real provider info (status from submission: queued/in_progress)
      await updateTask(taskId, {
        status: submission.status,
        provider: submission.provider,
        providerTaskId: submission.providerTaskId,
      });
    }
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error during media generation";
    console.error(
      `[generate-media] Failed for task ${taskId} (shot ${shotId}):`,
      err,
    );
    await updateTask(taskId, {
      status: "failed",
      errorMessage,
    });
  }
}
