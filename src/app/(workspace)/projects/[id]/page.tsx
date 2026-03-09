import { notFound } from "next/navigation";

import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { getProject } from "@/lib/db/store";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  return <WorkspaceShell initialProject={project} />;
}
