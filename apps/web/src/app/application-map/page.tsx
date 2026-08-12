"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { ResourceError, dateText } from "@/components/data-view";
import { api, unwrapList } from "@/lib/api";
import { EmptyState } from "@testpilot/ui";

type Project = { id: string; key: string; name: string };
type ApplicationMap = {
  id: string;
  name: string;
  generatedAt: string;
  graph?: { nodes?: unknown[]; edges?: unknown[] };
  environment?: { name?: string; kind?: string } | null;
};

export default function ApplicationMapPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <p className="subtle">Loading application maps…</p>
        </AppShell>
      }
    >
      <ApplicationMapContent />
    </Suspense>
  );
}

function ApplicationMapContent() {
  const requestedProjectId = useSearchParams().get("projectId") ?? undefined;
  const [projects, setProjects] = useState<Project[]>([]);
  const [maps, setMaps] = useState<ApplicationMap[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>(requestedProjectId);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const nextProjects = unwrapList<Project>(await api("/projects"));
        const nextProjectId = requestedProjectId ?? nextProjects[0]?.id;
        const nextMaps = nextProjectId
          ? unwrapList<ApplicationMap>(
              await api(`/projects/${nextProjectId}/application-maps`),
            )
          : [];
        if (active) {
          setProjects(nextProjects);
          setProjectId(nextProjectId);
          setMaps(nextMaps);
        }
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Could not load application maps.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [requestedProjectId, revision]);

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
      {loading ? (
        <p className="subtle">Loading application maps…</p>
      ) : error ? (
        <ResourceError message={error} retry={() => setRevision((value) => value + 1)} />
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
