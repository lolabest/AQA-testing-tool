import { AppShell } from "@/components/app-shell";
import { GeneratePlanButton } from "@/components/generate-plan-button";
import { unwrapList } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { Badge, EmptyState } from "@testpilot/ui";

export const dynamic = "force-dynamic";

type Requirement = {
  id: string;
  key: string;
  title: string;
  description: string;
  riskLevel: string;
};

export default async function RequirementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let requirements: Requirement[] = [];
  let error = "";
  try {
    requirements = unwrapList<Requirement>(
      await api(`/projects/${id}/requirements`),
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load requirements";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Traceability</p>
          <h1>Requirements</h1>
        </div>
        {requirements.length > 0 ? (
          <GeneratePlanButton
            projectId={id}
            requirementIds={requirements.map((item) => item.id)}
          />
        ) : null}
      </header>
      {error ? (
        <EmptyState title="Unable to load requirements" description={error} />
      ) : requirements.length === 0 ? (
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
            {requirements.map((item) => (
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
