"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, Status, useApiList } from "@/components/data-view";
import { EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type TestPlan = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  _count?: { testCases?: number; testSuites?: number };
};

export default function TestPlansPage() {
  const { id } = useParams<{ id: string }>();
  const plans = useApiList<TestPlan>(`/projects/${id}/test-plans`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Planning</p>
          <h1>Test plans</h1>
          <p className="lede">Generated plans remain traceable to their source requirements.</p>
        </div>
      </header>
      {plans.loading ? (
        <p className="subtle">Loading test plans…</p>
      ) : plans.error ? (
        <ResourceError message={plans.error} retry={plans.reload} />
      ) : !plans.data?.length ? (
        <EmptyState
          title="No test plans"
          description="Generate a plan from selected requirements to begin test design."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Test cases</th>
              <th>Suites</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {plans.data.map((plan) => (
              <tr key={plan.id}>
                <td>
                  <strong>{plan.name}</strong>
                </td>
                <td>
                  <Status value={plan.status} />
                </td>
                <td>{plan._count?.testCases ?? 0}</td>
                <td>{plan._count?.testSuites ?? 0}</td>
                <td>{plan.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
