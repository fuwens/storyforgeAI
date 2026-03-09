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

function getShotAssetUrl(shot: Shot): string {
  const approved = shot.assets.find((a) => a.approved);
  if (approved) return approved.storageUrl || approved.sourceUrl;
  if (shot.assets.length > 0) {
    const latest = shot.assets[shot.assets.length - 1];
    return latest.storageUrl || latest.sourceUrl;
  }
  return "";
}

function getActivePrompt(shot: Shot) {
  const active = shot.promptVariants.find((p) => p.isActive);
  return active || shot.promptVariants[0] || null;
}

/* ---------- ZIP ---------- */

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
      const approved = shot.assets.find((a) => a.approved);
      const latestAsset =
        shot.assets.length > 0
          ? shot.assets[shot.assets.length - 1]
          : null;
      const asset = approved || latestAsset;

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
            }
          : null,
      };
    }),
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const urlLines: string[] = [];
  for (const shot of project.shots) {
    const url = getShotAssetUrl(shot);
    urlLines.push(`Shot ${shot.sequence}: ${shot.title}`);
    urlLines.push(`  Image/Video URL: ${url || "(none)"}`);
    urlLines.push("");
  }
  zip.file("urls.txt", urlLines.join("\n"));

  return zip.generateAsync({ type: "nodebuffer" });
}

/* ---------- CSV ---------- */

function buildCsv(project: FullProject) {
  const latestScript = getLatestScript(project);
  const scriptContent = latestScript?.content || "";

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

  // scriptContent is available in manifest/txt; CSV focuses on shot-level data
  return BOM + rows.join("\n");
}

/* ---------- TXT ---------- */

function buildTxt(project: FullProject) {
  const latestScript = getLatestScript(project);
  return latestScript?.content || "";
}

/* ---------- util ---------- */

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
