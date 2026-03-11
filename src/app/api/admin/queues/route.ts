import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";
import { getMediaQueue, getQueue, getSyncQueue } from "@/lib/queue";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const queues = [
    { name: "storyforge", queue: getQueue() },
    { name: "generate_media", queue: getMediaQueue() },
    { name: "sync_tasks", queue: getSyncQueue() },
  ];

  const stats = await Promise.all(
    queues.map(async ({ name, queue }) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      const jobs = await queue.getJobs(["active", "waiting", "failed"], 0, 20);
      const jobDetails = jobs.map((job) => ({
        id: job.id,
        name: job.name,
        status: job.finishedOn ? "completed" : job.processedOn ? "active" : "waiting",
        data: job.data as Record<string, unknown>,
        failedReason: job.failedReason ?? null,
        timestamp: job.timestamp,
        processedOn: job.processedOn ?? null,
        finishedOn: job.finishedOn ?? null,
      }));

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        recentJobs: jobDetails,
      };
    }),
  );

  return NextResponse.json(stats);
}
