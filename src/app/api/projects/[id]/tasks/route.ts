import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { addTask, getProject, updateTask } from "@/lib/db/store";
import { syncProjectTasks } from "@/lib/tasks/task-runner";
import {
  ensureMediaWorker,
  ensureSyncWorker,
  ensureWorker,
  getMediaQueue,
  scheduleProjectSync,
} from "@/lib/queue";
import type { GenerationTask } from "@/lib/types";
import { uid } from "@/lib/utils";

// Ensure workers are running whenever this module is loaded in the server process.
ensureWorker();
ensureMediaWorker();
ensureSyncWorker();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Verify ownership before syncing
  const check = await getProject(id, session.userId);
  if (!check) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
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
  const mediaQueue = getMediaQueue();

  for (const shot of project.shots) {
    // 跳过已有进行中或排队中 task 的 shot，防止重复提交
    const hasActiveTask = shot.tasks.some(
      (t) => t.status === "queued" || t.status === "in_progress",
    );
    if (hasActiveTask) continue;

    const prompts = shot.promptVariants[0];
    const prompt =
      shot.generationType === "image"
        ? prompts?.imagePrompt || shot.sceneDescription
        : prompts?.videoPrompt || shot.sceneDescription;

    try {
      const taskId = uid("task");

      // Create a placeholder task in DB immediately (status: queued)
      // providerTaskId will be filled in by the worker after actual API submission.
      const task: GenerationTask = {
        id: taskId,
        shotId: shot.id,
        provider: "mock", // placeholder; updated by worker after real submission
        providerTaskId: "pending",
        mediaType: shot.generationType,
        model: shot.model || (shot.generationType === "image" ? "gpt-4o-image" : "kling-2-6"),
        requestPayload: {
          prompt,
          negativePrompt: prompts?.negativePrompt,
          aspectRatio: shot.aspectRatio,
          duration: shot.durationSeconds,
          modelConfig: shot.modelConfig,
        },
        status: "queued",
        createdAt: now,
        updatedAt: now,
      };

      await addTask(project.id, shot.id, task);

      // Enqueue the actual generation job
      await mediaQueue.add(
        "generate",
        {
          taskId,
          shotId: shot.id,
          projectId: project.id,
          mediaType: shot.generationType,
          prompt,
          negativePrompt: prompts?.negativePrompt,
          aspectRatio: shot.aspectRatio,
          duration: shot.durationSeconds,
          model: shot.model || (shot.generationType === "image" ? "gpt-4o-image" : "kling-2-6"),
          modelConfig: shot.modelConfig,
        },
        {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (err) {
      // Log and continue — one shot failure must not block others
      console.error(`[POST /tasks] Shot ${shot.id} enqueue failed:`, err);

      // Mark the task as failed if it was partially created
      const failedTask = shot.tasks.find(
        (t) => t.status === "queued" || t.status === "in_progress",
      );
      if (failedTask) {
        await updateTask(failedTask.id, {
          status: "failed",
          errorMessage: err instanceof Error ? err.message : "Failed to enqueue",
        }).catch(() => {}); // best-effort
      }
    }
  }

  // Schedule periodic sync for this project so in-progress video tasks get polled.
  await scheduleProjectSync(project.id).catch((err) => {
    console.error("[POST /tasks] scheduleProjectSync failed:", err);
  });

  // Return immediately with current project state (workers handle actual generation).
  const refreshed = await getProject(project.id, session.userId);
  return NextResponse.json(refreshed ?? project);
}
