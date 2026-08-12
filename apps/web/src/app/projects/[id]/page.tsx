import { AppShell } from "@/components/app-shell";
import { unwrapObject } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { Badge, EmptyState } from "@testpilot/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

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

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let overview: Overview | null = null;
  let error = "";
  try {
    overview = unwrapObject<Overview>(await api(`/projects/${id}/overview`));
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load project";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Project</p>
          <h1>{overview?.project?.name ?? "Project overview"}</h1>
        </div>
        <div className="button-row">
          <Link className="ui-button ui-button--secondary" href={`/projects/${id}/requirements`}>
            Requirements
          </Link>
          <Link className="ui-button ui-button--primary" href={`/projects/${id}/runs/new`}>
            New run
          </Link>
        </div>
      </header>
      {error ? (
        <EmptyState title="Project unavailable" description={error} />
      ) : (
        <div className="stack-lg">
          <section className="stat-row">
            <div>
              <span className="stat-label">Requirements</span>
              <strong>{overview?.project?._count?.requirements ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Pending healing</span>
              <strong>{overview?.pendingHealing ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Latest run</span>
              <strong>
                {overview?.recentRuns?.[0]?.status ? (
                  <Badge>{overview.recentRuns[0].status}</Badge>
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
                {Object.entries(overview?.testCasesByStatus ?? {}).map(([status, count]) => (
                  <tr key={status}>
                    <td>{status}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </AppShell>
  );
}
