import type { Prisma } from "@prisma/client";

import type {
  Asset,
  CreateProjectInput,
  ExportJob,
  GenerationTask,
  Project,
  Shot,
} from "@/lib/types";

import { prisma } from "./prisma";

const projectInclude = {
  scriptVersions: { orderBy: { version: "desc" as const } },
  shots: {
    orderBy: { sequence: "asc" as const },
    include: {
      promptVariants: { orderBy: { createdAt: "desc" as const } },
      generationTasks: { orderBy: { createdAt: "desc" as const } },
      assets: { orderBy: { createdAt: "desc" as const } },
    },
  },
  exportJobs: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.ProjectInclude;

function toProject(raw: Awaited<ReturnType<typeof queryProject>>): Project {
  if (!raw) throw new Error("Project not found");
  return {
    id: raw.id,
    title: raw.title,
    topic: raw.topic,
    targetDuration: raw.targetDuration,
    language: raw.language,
    platform: raw.platform,
    presetKey: raw.presetKey ?? "",
    styleTags: raw.styleTags,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    scriptVersions: raw.scriptVersions.map((sv) => ({
      id: sv.id,
      projectId: sv.projectId,
      content: sv.content,
      version: sv.version,
      createdAt: sv.createdAt.toISOString(),
    })),
    shots: raw.shots.map(toShot),
    exports: raw.exportJobs.map((ej) => ({
      id: ej.id,
      projectId: ej.projectId,
      format: ej.format as "zip" | "csv" | "txt",
      downloadUrl: ej.downloadUrl ?? "",
      createdAt: ej.createdAt.toISOString(),
      updatedAt: ej.updatedAt.toISOString(),
    })),
  };
}

type RawShot = NonNullable<Awaited<ReturnType<typeof queryProject>>>["shots"][number];

function toShot(raw: RawShot): Shot {
  return {
    id: raw.id,
    projectId: raw.projectId,
    sequence: raw.sequence,
    title: raw.title ?? `Shot ${raw.sequence}`,
    narration: raw.narration,
    sceneDescription: raw.sceneDescription,
    emotion: raw.emotion,
    shotType: raw.shotType,
    durationSeconds: raw.durationSeconds,
    generationType: raw.generationType,
    model: raw.model ?? undefined,
    aspectRatio: raw.aspectRatio ?? undefined,
    modelConfig: (raw.modelConfig as Record<string, unknown>) ?? {},
    promptVariants: raw.promptVariants.map((pv) => ({
      id: pv.id,
      imagePrompt: pv.imagePrompt,
      videoPrompt: pv.videoPrompt,
      negativePrompt: pv.negativePrompt ?? "",
      isActive: pv.isActive,
      createdAt: pv.createdAt.toISOString(),
      updatedAt: pv.updatedAt.toISOString(),
    })),
    tasks: raw.generationTasks.map((gt) => ({
      id: gt.id,
      shotId: gt.shotId,
      provider: gt.provider as "toapis" | "mock",
      providerTaskId: gt.providerTaskId,
      mediaType: gt.mediaType,
      model: gt.model,
      requestPayload: gt.requestPayload as Record<string, unknown>,
      status: gt.status,
      errorMessage: gt.errorMessage ?? undefined,
      sourceUrl: gt.sourceUrl ?? undefined,
      storageUrl: gt.storageUrl ?? undefined,
      expiresAt: gt.expiresAt?.toISOString(),
      createdAt: gt.createdAt.toISOString(),
      updatedAt: gt.updatedAt.toISOString(),
    })),
    assets: raw.assets.map((a) => ({
      id: a.id,
      shotId: a.shotId,
      sourceUrl: a.sourceUrl,
      storageUrl: a.storageUrl ?? undefined,
      mimeType: a.mimeType,
      approved: a.approved,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    })),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

async function queryProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: projectInclude,
  });
}

export async function listProjects(): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: projectInclude,
  });
  return rows.map(toProject);
}

export async function getProject(projectId: string): Promise<Project | null> {
  const raw = await queryProject(projectId);
  return raw ? toProject(raw) : null;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const raw = await prisma.project.create({
    data: {
      title: input.title,
      topic: input.topic,
      targetDuration: input.targetDuration,
      language: input.language,
      platform: input.platform,
      presetKey: input.presetKey,
      styleTags: input.styleTags,
    },
    include: projectInclude,
  });
  return toProject(raw);
}

export async function duplicateProject(projectId: string): Promise<Project | null> {
  const source = await queryProject(projectId);
  if (!source) return null;

  const raw = await prisma.project.create({
    data: {
      title: `${source.title} Copy`,
      topic: source.topic,
      targetDuration: source.targetDuration,
      language: source.language,
      platform: source.platform,
      presetKey: source.presetKey,
      styleTags: source.styleTags,
      status: "draft",
      scriptVersions: {
        create: source.scriptVersions.map((sv, idx) => ({
          content: sv.content,
          version: idx + 1,
        })),
      },
      shots: {
        create: source.shots.map((shot) => ({
          sequence: shot.sequence,
          title: shot.title,
          narration: shot.narration,
          sceneDescription: shot.sceneDescription,
          emotion: shot.emotion,
          shotType: shot.shotType,
          durationSeconds: shot.durationSeconds,
          generationType: shot.generationType,
          model: shot.model,
          aspectRatio: shot.aspectRatio,
          modelConfig: (shot.modelConfig ?? {}) as Prisma.InputJsonValue,
          promptVariants: {
            create: shot.promptVariants.map((pv) => ({
              imagePrompt: pv.imagePrompt,
              videoPrompt: pv.videoPrompt,
              negativePrompt: pv.negativePrompt,
              isActive: pv.isActive,
            })),
          },
        })),
      },
    },
    include: projectInclude,
  });
  return toProject(raw);
}

export async function saveScriptVersion(projectId: string, content: string) {
  const count = await prisma.scriptVersion.count({ where: { projectId } });
  const sv = await prisma.scriptVersion.create({
    data: {
      projectId,
      content,
      version: count + 1,
    },
  });
  await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  return {
    id: sv.id,
    projectId: sv.projectId,
    content: sv.content,
    version: sv.version,
    createdAt: sv.createdAt.toISOString(),
  };
}

export async function replaceShots(projectId: string, shots: Shot[]) {
  await prisma.$transaction(async (tx) => {
    await tx.shot.deleteMany({ where: { projectId } });

    for (const shot of shots) {
      await tx.shot.create({
        data: {
          projectId,
          sequence: shot.sequence,
          title: shot.title,
          narration: shot.narration,
          sceneDescription: shot.sceneDescription,
          emotion: shot.emotion,
          shotType: shot.shotType,
          durationSeconds: shot.durationSeconds,
          generationType: shot.generationType,
          model: shot.model,
          aspectRatio: shot.aspectRatio,
          modelConfig: (shot.modelConfig ?? {}) as Prisma.InputJsonValue,
          promptVariants: {
            create: shot.promptVariants.map((pv) => ({
              imagePrompt: pv.imagePrompt,
              videoPrompt: pv.videoPrompt,
              negativePrompt: pv.negativePrompt,
              isActive: pv.isActive,
            })),
          },
        },
      });
    }

    await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  });

  const project = await getProject(projectId);
  return project?.shots ?? null;
}

export async function updateShot(projectId: string, shotId: string, patch: Partial<Shot>) {
  const existing = await prisma.shot.findFirst({ where: { id: shotId, projectId } });
  if (!existing) return null;

  const updated = await prisma.shot.update({
    where: { id: shotId },
    data: {
      generationType: patch.generationType,
      model: patch.model,
      aspectRatio: patch.aspectRatio,
      durationSeconds: patch.durationSeconds,
      modelConfig: patch.modelConfig ? (patch.modelConfig as Prisma.InputJsonValue) : undefined,
      sceneDescription: patch.sceneDescription,
      narration: patch.narration,
    },
    include: {
      promptVariants: { orderBy: { createdAt: "desc" } },
      generationTasks: { orderBy: { createdAt: "desc" } },
      assets: { orderBy: { createdAt: "desc" } },
    },
  });

  await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  return toShot(updated);
}

export async function addTask(projectId: string, shotId: string, task: GenerationTask) {
  await prisma.generationTask.create({
    data: {
      id: task.id,
      shotId,
      provider: task.provider,
      providerTaskId: task.providerTaskId,
      mediaType: task.mediaType,
      model: task.model,
      requestPayload: task.requestPayload as Prisma.InputJsonValue,
      status: task.status,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "generating", updatedAt: new Date() },
  });

  return task;
}

export async function updateTask(
  taskId: string,
  patch: Partial<GenerationTask>,
  asset?: Asset,
) {
  const task = await prisma.generationTask.findUnique({
    where: { id: taskId },
    include: { shot: { select: { projectId: true } } },
  });
  if (!task) return null;

  await prisma.generationTask.update({
    where: { id: taskId },
    data: {
      status: patch.status as never,
      errorMessage: patch.errorMessage,
      sourceUrl: patch.sourceUrl,
      storageUrl: patch.storageUrl,
      expiresAt: patch.expiresAt ? new Date(patch.expiresAt) : undefined,
    },
  });

  if (asset) {
    await prisma.asset.create({
      data: {
        id: asset.id,
        shotId: task.shotId,
        sourceUrl: asset.sourceUrl,
        storageUrl: asset.storageUrl,
        mimeType: asset.mimeType,
        approved: false,
      },
    });
  }

  const hasActive = await prisma.generationTask.count({
    where: {
      shot: { projectId: task.shot.projectId },
      status: { in: ["queued", "in_progress"] },
    },
  });

  await prisma.project.update({
    where: { id: task.shot.projectId },
    data: {
      status: hasActive > 0 ? "generating" : "completed",
      updatedAt: new Date(),
    },
  });

  return patch;
}

export async function approveAsset(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { shot: { select: { id: true, projectId: true } } },
  });
  if (!asset) return null;

  await prisma.$transaction([
    prisma.asset.updateMany({
      where: { shotId: asset.shotId },
      data: { approved: false },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: { approved: true },
    }),
    prisma.project.update({
      where: { id: asset.shot.projectId },
      data: { updatedAt: new Date() },
    }),
  ]);

  return { ...asset, approved: true };
}

export async function findTask(taskId: string) {
  const task = await prisma.generationTask.findUnique({
    where: { id: taskId },
    include: {
      shot: {
        include: {
          project: { include: projectInclude },
          promptVariants: true,
          generationTasks: true,
          assets: true,
        },
      },
    },
  });
  if (!task) return null;
  return {
    project: toProject(task.shot.project),
    shot: toShot(task.shot),
    task: {
      id: task.id,
      shotId: task.shotId,
      provider: task.provider as "toapis" | "mock",
      providerTaskId: task.providerTaskId,
      mediaType: task.mediaType,
      model: task.model,
      requestPayload: task.requestPayload as Record<string, unknown>,
      status: task.status,
      errorMessage: task.errorMessage ?? undefined,
      sourceUrl: task.sourceUrl ?? undefined,
      storageUrl: task.storageUrl ?? undefined,
      expiresAt: task.expiresAt?.toISOString(),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    } satisfies GenerationTask,
  };
}

export async function addExport(projectId: string, exportJob: ExportJob) {
  await prisma.exportJob.create({
    data: {
      id: exportJob.id,
      projectId,
      format: exportJob.format,
      downloadUrl: exportJob.downloadUrl,
    },
  });
  await prisma.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
  return exportJob;
}

export async function getProjectByAsset(assetId: string) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: { shot: { select: { projectId: true } } },
  });
  if (!asset) return null;
  return getProject(asset.shot.projectId);
}

export async function updatePromptVariant(
  promptId: string,
  patch: { imagePrompt?: string; videoPrompt?: string; negativePrompt?: string },
) {
  const pv = await prisma.promptVariant.findUnique({
    where: { id: promptId },
    include: { shot: { select: { projectId: true } } },
  });
  if (!pv) return null;

  const updated = await prisma.promptVariant.update({
    where: { id: promptId },
    data: {
      imagePrompt: patch.imagePrompt ?? pv.imagePrompt,
      videoPrompt: patch.videoPrompt ?? pv.videoPrompt,
      negativePrompt: patch.negativePrompt ?? pv.negativePrompt,
    },
  });

  await prisma.project.update({
    where: { id: pv.shot.projectId },
    data: { updatedAt: new Date() },
  });

  return updated;
}

export async function getProjectByTask(taskId: string) {
  const task = await prisma.generationTask.findUnique({
    where: { id: taskId },
    include: { shot: { select: { projectId: true } } },
  });
  if (!task) return null;
  return getProject(task.shot.projectId);
}

/* ---------- Job Queue CRUD ---------- */

export async function createJob(job: {
  id: string;
  type: string;
  status?: string;
  payload: Record<string, unknown>;
}) {
  return prisma.job.create({
    data: {
      id: job.id,
      type: job.type,
      status: job.status ?? "pending",
      payload: job.payload as Prisma.InputJsonValue,
    },
  });
}

export async function updateJob(
  id: string,
  data: { status?: string; result?: Record<string, unknown>; error?: string },
) {
  return prisma.job.update({
    where: { id },
    data: {
      status: data.status,
      result: data.result ? (data.result as Prisma.InputJsonValue) : undefined,
      error: data.error,
    },
  });
}

export async function getJob(id: string) {
  return prisma.job.findUnique({ where: { id } });
}
