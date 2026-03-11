import { getProject } from "@/lib/db/store";
import { syncProjectTasks } from "@/lib/tasks/task-runner";

export type SyncTasksJobData = {
  projectId: string;
};

export async function syncTasksProcessor(data: SyncTasksJobData): Promise<void> {
  const { projectId } = data;

  try {
    // Check whether there are any active tasks before doing real work
    const project = await getProject(projectId);
    if (!project) {
      console.warn(`[sync-tasks] Project ${projectId} not found, skipping.`);
      return;
    }

    const hasActiveTasks = project.shots.some((shot) =>
      shot.tasks.some(
        (task) => task.status === "queued" || task.status === "in_progress",
      ),
    );

    if (!hasActiveTasks) {
      // Nothing to do — avoid unnecessary API calls
      return;
    }

    await syncProjectTasks(projectId);
  } catch (err) {
    console.error(`[sync-tasks] Failed for project ${projectId}:`, err);
    throw err; // re-throw so BullMQ can record the failure
  }
}
