import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getProject } from "@/lib/db/store";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) {
    notFound();
  }
  const { id } = await params;
  const project = await getProject(id, session.userId);

  if (!project) {
    notFound();
  }

  return <WorkspaceShell initialProject={project} />;
}
