import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { unwrapList } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

type TestPlan = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  createdAt: string;
  _count?: { testCases?: number; testSuites?: number };
};

export default async function TestPlansPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let plans: TestPlan[] = [];
  let error = "";
  try {
    plans = unwrapList<TestPlan>(await serverApi(`/projects/${id}/test-plans`));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load test plans.";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Planning</p>
          <h1>Test plans</h1>
          <p className="lede">Generated plans remain traceable to their source requirements.</p>
        </div>
      </header>
      {error ? (
        <EmptyState title="Test plans unavailable" description={error} />
      ) : plans.length === 0 ? (
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
            {plans.map((plan) => (
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
