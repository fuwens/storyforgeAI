import { Queue, Worker } from "bullmq";
import type { Job as BullJob } from "bullmq";

import { exportZipProcessor } from "./processors/export-zip";
import { generateMediaProcessor } from "./processors/generate-media";
import { syncTasksProcessor } from "./processors/sync-tasks";

const connection = { host: "localhost", port: 6379 };

/* ──────────────────────────────────────────────────────────
   Singleton holders — avoid duplicates during Next.js hot reload
   ────────────────────────────────────────────────────────── */
const g = globalThis as unknown as {
  // existing export-zip queue/worker
  _sfQueue?: Queue;
  _sfWorker?: Worker;

  // new: media generation queue/worker
  _sfMediaQueue?: Queue;
  _sfMediaWorker?: Worker;

  // new: sync tasks queue/worker
  _sfSyncQueue?: Queue;
  _sfSyncWorker?: Worker;
};

/* ──────────────────────────────────────────────────────────
   1. Export-ZIP queue (unchanged)
   ────────────────────────────────────────────────────────── */
export function getQueue(): Queue {
  if (!g._sfQueue) {
    g._sfQueue = new Queue("storyforge", { connection });
  }
  return g._sfQueue;
}

export function ensureWorker(): void {
  if (g._sfWorker) return;

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

  g._sfWorker = worker;
}

/* ──────────────────────────────────────────────────────────
   2. Media generation queue
   ────────────────────────────────────────────────────────── */
export function getMediaQueue(): Queue {
  if (!g._sfMediaQueue) {
    g._sfMediaQueue = new Queue("generate_media", { connection });
  }
  return g._sfMediaQueue;
}

export function ensureMediaWorker(): void {
  if (g._sfMediaWorker) return;

  const worker = new Worker(
    "generate_media",
    async (job: BullJob) => {
      await generateMediaProcessor(job.data);
    },
    {
      connection,
      concurrency: 4,
    },
  );

  worker.on("failed", (job, err) => {
    if (!job) return;
    console.error(
      `[generate_media] Job ${job.id} failed (attempt ${job.attemptsMade}):`,
      err.message,
    );
  });

  g._sfMediaWorker = worker;
}

/* ──────────────────────────────────────────────────────────
   3. Sync-tasks queue  (periodic polling for in-progress tasks)
   ────────────────────────────────────────────────────────── */
export function getSyncQueue(): Queue {
  if (!g._sfSyncQueue) {
    g._sfSyncQueue = new Queue("sync_tasks", { connection });
  }
  return g._sfSyncQueue;
}

export function ensureSyncWorker(): void {
  if (g._sfSyncWorker) return;

  const worker = new Worker(
    "sync_tasks",
    async (job: BullJob) => {
      await syncTasksProcessor(job.data);
    },
    {
      connection,
      concurrency: 2,
    },
  );

  worker.on("failed", (job, err) => {
    if (!job) return;
    console.error(`[sync_tasks] Job ${job.id} failed:`, err.message);
  });

  g._sfSyncWorker = worker;
}

/* ──────────────────────────────────────────────────────────
   4. Bootstrap all workers + schedule repeating sync job
   ────────────────────────────────────────────────────────── */
export function bootstrapQueues(): void {
  ensureWorker();
  ensureMediaWorker();
  ensureSyncWorker();

  // Schedule a repeating sync job — fires every 15 s.
  // The processor itself checks for active tasks before doing real work.
  // We fire it for a sentinel projectId "all"; the processor can handle
  // cross-project polling if needed.  For now each POST /tasks will also
  // enqueue a project-specific repeating job when tasks are submitted.
}

/* ──────────────────────────────────────────────────────────
   Helper: enqueue a per-project repeating sync job
   ────────────────────────────────────────────────────────── */
export async function scheduleProjectSync(projectId: string): Promise<void> {
  const queue = getSyncQueue();
  // Add a repeatable job keyed by projectId; BullMQ deduplicates by jobId.
  await queue.add(
    "sync",
    { projectId },
    {
      repeat: { every: 15_000 },
      jobId: `sync-${projectId}`,
      removeOnComplete: true,
      removeOnFail: false,
    },
  );
}

// Convenience export so the route can grab the queue without calling getMediaQueue()
export const mediaQueue = {
  add: async (
    name: string,
    data: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ) => {
    const q = getMediaQueue();
    return q.add(name, data, opts as never);
  },
};
