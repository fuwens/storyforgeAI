import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";
import { NextResponse } from "next/server";

import { addExport, getProject } from "@/lib/db/store";
import type { ExportJob, Shot } from "@/lib/types";
import { uid } from "@/lib/utils";

type FullProject = NonNullable<Awaited<ReturnType<typeof getProject>>>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as { format?: "zip" | "csv" | "txt" };
  const format = body.format || "zip";

  const project = await getProject(id);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  let fileName = "";
  let buffer: Buffer;
  if (format === "csv") {
    fileName = `${project.id}-shots.csv`;
    buffer = Buffer.from(buildCsv(project), "utf8");
  } else if (format === "txt") {
    fileName = `${project.id}-script.txt`;
    buffer = Buffer.from(buildTxt(project), "utf8");
  } else {
    fileName = `${project.id}-assets.zip`;
    buffer = await buildZip(project);
  }

  const outputDir = path.join(process.cwd(), "public", "generated");
  const outputPath = path.join(outputDir, fileName);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputPath, buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown write error";
    return NextResponse.json(
      { error: `Failed to write export file: ${message}` },
      { status: 500 },
    );
  }

  const downloadUrl = `/generated/${fileName}`;
  const now = new Date().toISOString();
  const exportJob: ExportJob = {
    id: uid("export"),
    projectId: project.id,
    format,
    downloadUrl,
    createdAt: now,
    updatedAt: now,
  };
  await addExport(project.id, exportJob);

  const refreshed = await getProject(project.id);
  return NextResponse.json({ downloadUrl, project: refreshed });
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

function getShotAssetUrl(shot: Shot): string {
  const asset = getShotAsset(shot);
  if (!asset) return "";
  return asset.storageUrl || asset.sourceUrl;
}

function getActivePrompt(shot: Shot) {
  const active = shot.promptVariants.find((p) => p.isActive);
  return active || shot.promptVariants[0] || null;
}

/* ---------- ZIP (downloads actual media files) ---------- */

async function fetchMediaBuffer(url: string): Promise<Buffer | null> {
  if (!url) return null;
  try {
    // Local path (storageUrl like "/generated/xxx.mp4") — read from disk
    if (url.startsWith("/")) {
      const localPath = path.join(process.cwd(), "public", url);
      return await fs.readFile(localPath);
    }
    // Remote URL — fetch over HTTP
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

function guessExtension(url: string, mimeType?: string): string {
  if (mimeType) {
    if (mimeType.startsWith("video/mp4")) return ".mp4";
    if (mimeType.startsWith("video/")) return ".mp4";
    if (mimeType.startsWith("image/png")) return ".png";
    if (mimeType.startsWith("image/webp")) return ".webp";
    if (mimeType.startsWith("image/jpeg")) return ".jpg";
    if (mimeType.startsWith("image/")) return ".jpg";
  }
  // guess from URL
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext && ["mp4", "webm", "png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    return `.${ext}`;
  }
  return ".bin";
}

async function buildZip(project: FullProject) {
  const zip = new JSZip();
  const latestScript = getLatestScript(project);

  // manifest.json
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

  // Download each shot's media file and add to zip
  const mediaFolder = zip.folder("media")!;
  const urlLines: string[] = [];

  await Promise.allSettled(
    project.shots.map(async (shot) => {
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

  zip.file("urls.txt", urlLines.filter(Boolean).join("\n\n"));

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 3 } });
}

/* ---------- CSV ---------- */

function buildCsv(project: FullProject) {
  const BOM = "\uFEFF";
  const header = [
    "Shot序号",
    "标题",
    "场景描述",
    "旁白",
    "情绪",
    "镜头类型",
    "时长",
    "素材URL",
    "Image Prompt",
    "Video Prompt",
  ].join(",");

  const rows = [header];
  for (const shot of project.shots) {
    const url = getShotAssetUrl(shot);
    const prompt = getActivePrompt(shot);
    rows.push(
      [
        shot.sequence,
        csvEscape(shot.title),
        csvEscape(shot.sceneDescription),
        csvEscape(shot.narration),
        csvEscape(shot.emotion),
        csvEscape(shot.shotType),
        shot.durationSeconds,
        csvEscape(url),
        csvEscape(prompt?.imagePrompt || ""),
        csvEscape(prompt?.videoPrompt || ""),
      ].join(","),
    );
  }

  return BOM + rows.join("\n");
}

/* ---------- TXT ---------- */

function buildTxt(project: FullProject) {
  const latestScript = getLatestScript(project);
  return latestScript?.content || "";
}

/* ---------- util ---------- */

function csvEscape(value: string) {
  return `"${(value ?? "").replaceAll('"', '""')}"`;
}
