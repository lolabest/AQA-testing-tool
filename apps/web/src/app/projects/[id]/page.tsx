"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge, EmptyState } from "@testpilot/ui";

import { AppShell } from "@/components/app-shell";
import { ResourceError, useApiObject } from "@/components/data-view";

type Overview = {
  project?: {
    name?: string;
    _count?: {
      requirements?: number;
      environments?: number;
      testCases?: number;
      testSuites?: number;
    };
  };
  pendingHealing?: number;
  recentRuns?: Array<{ id: string; status: string }>;
  testCasesByStatus?: Record<string, number>;
  totals?: { passed?: number; failed?: number; total?: number };
};

export default function ProjectOverviewPage() {
  const { id } = useParams<{ id: string }>();
  const overview = useApiObject<Overview>(`/projects/${id}/overview`);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{overview.data?.project?.name ?? "Project overview"}</h1>
        </div>
        <div className="button-row">
          <Link
            className="ui-button ui-button--secondary"
            href={`/projects/${id}/requirements`}
          >
            Requirements
          </Link>
          <Link
            className="ui-button ui-button--primary"
            href={`/projects/${id}/runs/new`}
          >
            New run
          </Link>
        </div>
      </header>
      {overview.loading ? (
        <p className="subtle">Loading project…</p>
      ) : overview.error ? (
        <ResourceError message={overview.error} retry={overview.reload} />
      ) : !overview.data ? (
        <EmptyState title="Project unavailable" description="No overview data." />
      ) : (
        <div className="stack-lg">
          <section className="stat-row">
            <div>
              <span className="stat-label">Requirements</span>
              <strong>{overview.data.project?._count?.requirements ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Pending healing</span>
              <strong>{overview.data.pendingHealing ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Latest run</span>
              <strong>
                {overview.data.recentRuns?.[0]?.status ? (
                  <Badge>{overview.data.recentRuns[0].status}</Badge>
                ) : (
                  "None"
                )}
              </strong>
            </div>
          </section>
          <section>
            <h2>Test case statuses</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(overview.data.testCasesByStatus ?? {}).map(
                  ([status, count]) => (
                    <tr key={status}>
                      <td>{status}</td>
                      <td>{count}</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AppShell>
  );
}
