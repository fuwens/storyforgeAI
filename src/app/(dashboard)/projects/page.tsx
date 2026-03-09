import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";
import { ProjectDashboard } from "@/components/workspace/project-dashboard";
import { listProjects } from "@/lib/db/store";

export default async function ProjectsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const projects = await listProjects(session.userId);

  return <ProjectDashboard initialProjects={projects} />;
}
