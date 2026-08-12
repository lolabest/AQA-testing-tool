"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, useApiList } from "@/components/data-view";
import { TestCaseActions } from "@/components/test-case-actions";
import { Badge, EmptyState } from "@testpilot/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

type TestCase = {
  id: string;
  key: string;
  title: string;
  status: string;
  riskLevel: string;
};

export default function TestCasesPage() {
  const { id } = useParams<{ id: string }>();
  const cases = useApiList<TestCase>(`/projects/${id}/test-cases`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution candidates</p>
          <h1>Test cases</h1>
        </div>
      </header>
      {cases.loading ? (
        <p className="subtle">Loading test cases…</p>
      ) : cases.error ? (
        <ResourceError message={cases.error} retry={cases.reload} />
      ) : !cases.data?.length ? (
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
            {cases.data.map((item) => (
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
