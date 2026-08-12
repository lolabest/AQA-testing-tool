import { AppShell } from "@/components/app-shell";
import { TestCaseActions } from "@/components/test-case-actions";
import { unwrapList } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { Badge, EmptyState } from "@testpilot/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

type TestCase = {
  id: string;
  key: string;
  title: string;
  status: string;
  riskLevel: string;
};

export default async function TestCasesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let cases: TestCase[] = [];
  let error = "";
  try {
    cases = unwrapList<TestCase>(await api(`/projects/${id}/test-cases`));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load test cases";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution candidates</p>
          <h1>Test cases</h1>
        </div>
      </header>
      {error ? (
        <EmptyState title="Unable to load test cases" description={error} />
      ) : cases.length === 0 ? (
        <EmptyState
          title="No test cases"
          description="Generate a plan from requirements to create reviewable cases."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Title</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/projects/${id}/test-cases/${item.id}`}>
                    {item.key}
                  </Link>
                </td>
                <td>{item.title}</td>
                <td>
                  <Badge>{item.status}</Badge>
                </td>
                <td>{item.riskLevel}</td>
                <td>
                  <TestCaseActions
                    projectId={id}
                    testCaseId={item.id}
                    status={item.status}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
