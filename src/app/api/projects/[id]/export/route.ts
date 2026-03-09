import { NextResponse } from "next/server";

import { addExport, createJob, getProject } from "@/lib/db/store";
import { ensureWorker, getQueue } from "@/lib/queue";
import type { ExportJob } from "@/lib/types";
import { uid } from "@/lib/utils";

// Initialize worker on first import
ensureWorker();

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

  // CSV and TXT are lightweight — keep synchronous
  if (format === "csv" || format === "txt") {
    const { buildCsv, buildTxt } = await import("@/lib/queue/processors/export-helpers");
    const fileName = format === "csv"
      ? `${project.id}-shots.csv`
      : `${project.id}-script.txt`;
    const content = format === "csv" ? buildCsv(project) : buildTxt(project);
    const buffer = Buffer.from(content, "utf8");

    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const outputDir = path.join(process.cwd(), "public", "generated");
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, fileName), buffer);

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

  // ZIP → async via BullMQ
  const jobId = uid("job");
  const fileName = `${project.id}-assets.zip`;

  await createJob({
    id: jobId,
    type: "export_zip",
    payload: { type: "export_zip", projectId: project.id, fileName },
  });

  const queue = getQueue();
  await queue.add("export_zip", { type: "export_zip", projectId: project.id, fileName }, {
    jobId,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });

  return NextResponse.json({ jobId, status: "pending" });
}
