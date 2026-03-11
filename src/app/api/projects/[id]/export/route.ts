import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { addExport, createJob, getActiveJobByProject, getProject } from "@/lib/db/store";
import { ensureWorker, getQueue } from "@/lib/queue";
import type { ExportJob } from "@/lib/types";
import { uid } from "@/lib/utils";

// Initialize worker on first import
ensureWorker();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as { format?: "zip" | "csv" | "txt"; shotIds?: string[] };
  const format = body.format || "zip";
  const shotIds = body.shotIds;

  const project = await getProject(id, session.userId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // CSV and TXT are lightweight — keep synchronous
  if (format === "csv" || format === "txt") {
    const { buildCsv, buildTxt } = await import("@/lib/queue/processors/export-helpers");
    const fileName = format === "csv"
      ? `${project.id}-shots.csv`
      : `${project.id}-script.txt`;

    // Filter project shots if shotIds provided
    const filteredProject = shotIds?.length
      ? { ...project, shots: project.shots.filter((s) => shotIds.includes(s.id)) }
      : project;

    const content = format === "csv" ? buildCsv(filteredProject) : buildTxt(filteredProject);
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

    const refreshed = await getProject(project.id, session.userId);
    return NextResponse.json({ downloadUrl, project: refreshed });
  }

  // ZIP → async via BullMQ
  // Cache: if zip already exists for current project version, return directly
  const timestamp = new Date(project.updatedAt).getTime();
  const fileName = `${project.id}-${timestamp}-assets.zip`;
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const zipPath = path.join(process.cwd(), "public", "generated", fileName);
  try {
    await fs.access(zipPath);
    // File exists — content unchanged, return cached download URL
    return NextResponse.json({ downloadUrl: `/generated/${fileName}` });
  } catch {
    // File doesn't exist — need to build
  }

  // Dedup: return existing job if one is already pending/active
  const existingJob = await getActiveJobByProject(project.id, "export_zip");
  if (existingJob) {
    return NextResponse.json({ jobId: existingJob.id, status: existingJob.status });
  }

  const jobId = uid("job");

  await createJob({
    id: jobId,
    type: "export_zip",
    payload: { type: "export_zip", projectId: project.id, fileName, shotIds },
  });

  const queue = getQueue();
  await queue.add("export_zip", { type: "export_zip", projectId: project.id, fileName, shotIds }, {
    jobId,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  });

  return NextResponse.json({ jobId, status: "pending" });
}
