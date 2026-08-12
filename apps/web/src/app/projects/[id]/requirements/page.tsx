"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, useApiList } from "@/components/data-view";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { Badge, EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type Requirement = {
  id: string;
  key: string;
  title: string;
  description: string;
  riskLevel: string;
};

export default function RequirementsPage() {
  const { id } = useParams<{ id: string }>();
  const requirements = useApiList<Requirement>(`/projects/${id}/requirements`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Traceability</p>
          <h1>Requirements</h1>
        </div>
        {requirements.data?.length ? (
          <GeneratePlanButton
            projectId={id}
            requirementIds={requirements.data.map((item) => item.id)}
          />
        ) : null}
      </header>
      {requirements.loading ? (
        <p className="subtle">Loading requirements…</p>
      ) : requirements.error ? (
        <ResourceError message={requirements.error} retry={requirements.reload} />
      ) : !requirements.data?.length ? (
        <EmptyState
          title="No requirements"
          description="Import natural-language requirements to begin planning."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Title</th>
              <th>Risk</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {requirements.data.map((item) => (
              <tr key={item.id}>
                <td>{item.key}</td>
                <td>{item.title}</td>
                <td>
                  <Badge>{item.riskLevel}</Badge>
                </td>
                <td>{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
