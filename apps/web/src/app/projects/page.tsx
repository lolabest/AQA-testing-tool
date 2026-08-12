import { AppShell } from "@/components/app-shell";
import { unwrapList } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Project = { id: string; name: string; key: string; description?: string | null };

export default async function ProjectsPage() {
  let projects: Project[] = [];
  let error = "";
  try {
    projects = unwrapList<Project>(await api("/projects"));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load projects";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Projects</h1>
        </div>
      </header>
      {error ? (
        <EmptyState title="Unable to load projects" description={error} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects"
          description="Seed the database or create a project via the API."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <Link href={`/projects/${project.id}`}>{project.key}</Link>
                </td>
                <td>{project.name}</td>
                <td>{project.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
