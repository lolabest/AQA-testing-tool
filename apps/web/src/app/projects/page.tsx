"use client";

import Link from "next/link";

import { EmptyState } from "@testpilot/ui";

import { AppShell } from "@/components/app-shell";
import {
  Entity,
  ResourceError,
  text,
  useApiList,
} from "@/components/data-view";

export default function ProjectsPage() {
  const projects = useApiList<Entity>("/projects");

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Projects</h1>
        </div>
      </header>
      {projects.loading ? (
        <p className="subtle">Loading projects…</p>
      ) : projects.error ? (
        <ResourceError message={projects.error} retry={projects.reload} />
      ) : !projects.data?.length ? (
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
            {projects.data.map((project) => (
              <tr key={text(project.id)}>
                <td>
                  <Link href={`/projects/${text(project.id)}`}>
                    {text(project.key)}
                  </Link>
                </td>
                <td>{text(project.name)}</td>
                <td>{text(project.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
