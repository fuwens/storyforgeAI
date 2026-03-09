import { NextResponse } from "next/server";

import { retryTask } from "@/lib/tasks/task-runner";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const ok = await retryTask(taskId);
  if (!ok) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
