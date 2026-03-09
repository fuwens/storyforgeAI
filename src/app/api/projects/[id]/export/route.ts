import fs from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";
import { NextResponse } from "next/server";

import { addExport, getProject } from "@/lib/db/store";
import type { ExportJob } from "@/lib/types";
import { uid } from "@/lib/utils";

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
    buffer = Buffer.from(project.scriptVersions[0]?.content || "", "utf8");
  } else {
    fileName = `${project.id}-assets.zip`;
    buffer = await buildZip(project);
  }

  const outputPath = path.join(process.cwd(), "public", "generated", fileName);
  await fs.writeFile(outputPath, buffer);
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

function buildCsv(project: NonNullable<Awaited<ReturnType<typeof getProject>>>) {
  const rows = [
    ["sequence", "title", "narration", "scene_description", "generation_type", "model", "approved_asset"].join(","),
  ];
  for (const shot of project.shots) {
    const approved = shot.assets.find((asset) => asset.approved)?.storageUrl || "";
    rows.push(
      [
        shot.sequence,
        csvEscape(shot.title),
        csvEscape(shot.narration),
        csvEscape(shot.sceneDescription),
        shot.generationType,
        shot.model || "",
        approved,
      ].join(","),
    );
  }
  return rows.join("\n");
}

async function buildZip(project: NonNullable<Awaited<ReturnType<typeof getProject>>>) {
  const zip = new JSZip();
  zip.file("script.txt", project.scriptVersions[0]?.content || "");
  zip.file("shots.csv", buildCsv(project));

  for (const shot of project.shots) {
    const approved = shot.assets.find((asset) => asset.approved) || shot.assets[0];
    if (!approved) continue;
    const assetUrl = approved.storageUrl || approved.sourceUrl;
    if (!assetUrl.startsWith("/generated/")) continue;
    const filePath = path.join(process.cwd(), "public", assetUrl.replace(/^\//, ""));
    const fileBuffer = await fs.readFile(filePath);
    zip.file(`assets/shot-${shot.sequence}-${path.basename(assetUrl)}`, fileBuffer);
  }

  return zip.generateAsync({ type: "nodebuffer" });
}

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
