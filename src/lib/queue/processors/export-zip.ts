import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import { getProject } from "@/lib/db/store";
import type { Shot } from "@/lib/types";

type FullProject = NonNullable<Awaited<ReturnType<typeof getProject>>>;

export async function exportZipProcessor(data: {
  type: string;
  projectId: string;
  fileName: string;
  shotIds?: string[];
}): Promise<{ filePath: string }> {
  const { projectId, fileName, shotIds } = data;
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found");

  // Filter shots if shotIds provided
  const filteredProject = shotIds?.length
    ? { ...project, shots: project.shots.filter((s) => shotIds.includes(s.id)) }
    : project;

  const buffer = await buildZip(filteredProject);

  const outputDir = path.join(process.cwd(), "public", "generated");
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, buffer);

  return { filePath };
}

/* ---------- helpers ---------- */

function getLatestScript(project: FullProject) {
  if (project.scriptVersions.length === 0) return null;
  return project.scriptVersions.reduce((a, b) =>
    a.version > b.version ? a : b,
  );
}

function getShotAsset(shot: Shot) {
  const approved = shot.assets.find((a) => a.approved);
  if (approved) return approved;
  if (shot.assets.length > 0) return shot.assets[shot.assets.length - 1];
  return null;
}

function getActivePrompt(shot: Shot) {
  const active = shot.promptVariants.find((p) => p.isActive);
  return active || shot.promptVariants[0] || null;
}

async function fetchMediaBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", url);
      return await fs.readFile(localPath);
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

function guessExtension(url: string, mimeType?: string): string {
  if (mimeType) {
    if (mimeType.startsWith("video/")) return ".mp4";
    if (mimeType.startsWith("image/png")) return ".png";
    if (mimeType.startsWith("image/webp")) return ".webp";
    if (mimeType.startsWith("image/jpeg") || mimeType.startsWith("image/jpg")) return ".jpg";
    if (mimeType.startsWith("image/")) return ".jpg";
  }
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext && ["mp4", "webm", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return `.${ext}`;
  }
  return ".bin";
}

/* ---------- ZIP builder ---------- */

async function buildZip(project: FullProject) {
  const zip = new JSZip();
  const latestScript = getLatestScript(project);

  const manifest: Record<string, unknown> = {
    project: {
      title: project.title,
      topic: project.topic,
      platform: project.platform,
      language: project.language,
    },
    script: latestScript?.content || "",
    shots: project.shots.map((shot) => {
      const prompt = getActivePrompt(shot);
      const asset = getShotAsset(shot);
      return {
        sequence: shot.sequence,
        title: shot.title,
        sceneDescription: shot.sceneDescription,
        narration: shot.narration,
        emotion: shot.emotion,
        shotType: shot.shotType,
        durationSeconds: shot.durationSeconds,
        prompt: prompt
          ? {
              imagePrompt: prompt.imagePrompt,
              videoPrompt: prompt.videoPrompt,
              negativePrompt: prompt.negativePrompt,
            }
          : null,
        asset: asset
          ? {
              sourceUrl: asset.sourceUrl,
              storageUrl: asset.storageUrl || null,
              approved: asset.approved,
            }
          : null,
      };
    }),
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const mediaFolder = zip.folder("media")!;
  const urlLines: string[] = [];

  const CONCURRENCY = 3;
  const shots = [...project.shots];
  for (let i = 0; i < shots.length; i += CONCURRENCY) {
    const batch = shots.slice(i, i + CONCURRENCY);
    await Promise.allSettled(
      batch.map(async (shot) => {
        const asset = getShotAsset(shot);
        const url = asset ? (asset.storageUrl || asset.sourceUrl) : "";
        const seqLabel = String(shot.sequence).padStart(2, "0");

        urlLines[shot.sequence - 1] =
          `Shot ${shot.sequence}: ${shot.title}\n  URL: ${url || "(none)"}`;

        if (!url) return;

        const buf = await fetchMediaBuffer(url);
        if (!buf) return;

        const ext = guessExtension(url, asset?.mimeType);
        const fileName = `shot-${seqLabel}-${shot.title.replace(/[^\w\u4e00-\u9fa5]/g, "_")}${ext}`;
        mediaFolder.file(fileName, buf);
      }),
    );
  }

  zip.file("urls.txt", urlLines.filter(Boolean).join("\n\n"));

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 3 },
  });
}
