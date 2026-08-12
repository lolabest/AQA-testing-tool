import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { dateText } from "@/components/data-view";
import { unwrapList } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

type Project = { id: string; key: string; name: string };
type ApplicationMap = {
  id: string;
  name: string;
  generatedAt: string;
  graph?: { nodes?: unknown[]; edges?: unknown[] };
  environment?: { name?: string; kind?: string } | null;
};

export default async function ApplicationMapPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const requestedProjectId = (await searchParams).projectId;
  let projects: Project[] = [];
  let maps: ApplicationMap[] = [];
  let error = "";
  let projectId = requestedProjectId;
  try {
    projects = unwrapList<Project>(await serverApi("/projects"));
    projectId = requestedProjectId ?? projects[0]?.id;
    if (projectId) {
      maps = unwrapList<ApplicationMap>(
        await serverApi(`/projects/${projectId}/application-maps`),
      );
    }
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load application maps.";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Project discovery</p>
          <h1>Application map</h1>
          <p className="lede">
            Reviewed routes and relationships discovered in authorized environments.
          </p>
        </div>
        {projects.length > 1 ? (
          <div className="page-actions" aria-label="Choose project">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/application-map?projectId=${project.id}`}
                className={`ui-button ${
                  project.id === projectId
                    ? "ui-button--primary"
                    : "ui-button--secondary"
                }`}
              >
                {project.key}
              </Link>
            ))}
          </div>
        ) : null}
      </header>
      {error ? (
        <EmptyState title="Application maps unavailable" description={error} />
      ) : !projectId ? (
        <EmptyState
          title="No project selected"
          description="Create a project before collecting an application map."
        />
      ) : maps.length === 0 ? (
        <EmptyState
          title="No application maps"
          description="No reviewed discovery map has been persisted for this project."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Environment</th>
              <th>Nodes</th>
              <th>Relationships</th>
              <th>Generated</th>
            </tr>
          </thead>
          <tbody>
            {maps.map((map) => (
              <tr key={map.id}>
                <td>
                  <strong>{map.name}</strong>
                </td>
                <td>{map.environment?.name ?? "Unscoped"}</td>
                <td>{map.graph?.nodes?.length ?? 0}</td>
                <td>{map.graph?.edges?.length ?? 0}</td>
                <td>{dateText(map.generatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
