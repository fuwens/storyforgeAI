import { Queue, Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";

import { exportZipProcessor } from "./processors/export-zip";

const connection = { host: "localhost", port: 6379 };

/* Singleton: avoid duplicates during Next.js hot reload */
const globalForQueue = globalThis as unknown as {
  _sfQueue?: Queue;
  _sfWorker?: Worker;
};

export function getQueue(): Queue {
  if (!globalForQueue._sfQueue) {
    globalForQueue._sfQueue = new Queue("storyforge", { connection });
  }
  return globalForQueue._sfQueue;
}

export function ensureWorker(): void {
  if (globalForQueue._sfWorker) return;

  const worker = new Worker(
    "storyforge",
    async (job: BullJob) => {
      const { updateJob } = await import("@/lib/db/store");

      await updateJob(job.id!, { status: "active" });

      switch (job.data.type) {
        case "export_zip":
          return exportZipProcessor(job.data);
        default:
          throw new Error(`Unknown job type: ${job.data.type}`);
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on("completed", async (job, result) => {
    const { updateJob } = await import("@/lib/db/store");
    await updateJob(job.id!, {
      status: "completed",
      result: result as Record<string, unknown>,
    });
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const { updateJob } = await import("@/lib/db/store");
    await updateJob(job.id!, {
      status: "failed",
      error: err.message,
    });
  });

  globalForQueue._sfWorker = worker;
}
