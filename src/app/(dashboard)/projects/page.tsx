import { ProjectDashboard } from "@/components/workspace/project-dashboard";
import { listProjects } from "@/lib/db/store";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return <ProjectDashboard initialProjects={projects} />;
}
