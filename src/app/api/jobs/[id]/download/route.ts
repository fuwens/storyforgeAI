import { NextResponse } from "next/server";

import { getJob } from "@/lib/db/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // If job is completed and has a file, stream it directly
  if (job.status === "completed" && job.result?.filePath) {
    try {
      const fs = await import("node:fs/promises");
      const buffer = await fs.readFile(job.result.filePath);
      const fileName = job.result.filePath.split("/").pop() || "export.zip";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Length": buffer.length.toString(),
        },
      });
    } catch (err) {
      console.error("Failed to read export file:", err);
      return NextResponse.json(
        { error: "File not found or unreadable", job },
        { status: 404 },
      );
    }
  }

  // Job not completed or no file yet — return status
  return NextResponse.json(job);
}
