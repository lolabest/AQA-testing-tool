"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, Status, useApiList } from "@/components/data-view";
import { EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type Suite = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  status: string;
  items?: Array<{ id: string; enabled: boolean }>;
};

export default function SuitesPage() {
  const { id } = useParams<{ id: string }>();
  const suites = useApiList<Suite>(`/projects/${id}/suites`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution groups</p>
          <h1>Test suites</h1>
          <p className="lede">Executable suites composed of reviewed test cases.</p>
        </div>
      </header>
      {suites.loading ? (
        <p className="subtle">Loading suites…</p>
      ) : suites.error ? (
        <ResourceError message={suites.error} retry={suites.reload} />
      ) : !suites.data?.length ? (
        <EmptyState
          title="No test suites"
          description="Create a suite from approved test cases before starting a run."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Name</th>
              <th>Status</th>
              <th>Enabled cases</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {suites.data.map((suite) => (
              <tr key={suite.id}>
                <td className="mono">{suite.key}</td>
                <td>
                  <strong>{suite.name}</strong>
                </td>
                <td>
                  <Status value={suite.status} />
                </td>
                <td>{suite.items?.filter((item) => item.enabled).length ?? 0}</td>
                <td>{suite.description ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
