import { AppShell } from "@/components/app-shell";
import { unwrapList, unwrapObject } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { Badge, EmptyState } from "@testpilot/ui";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Project = { id: string; name: string; key: string; description?: string | null };
type Overview = {
  project?: {
    _count?: {
      requirements?: number;
      environments?: number;
      testCases?: number;
      testSuites?: number;
    };
  };
  pendingHealing?: number;
  recentRuns?: Array<{
    id: string;
    status: string;
    totalTests?: number;
    passedTests?: number;
    failedTests?: number;
    skippedTests?: number;
  }>;
  totals?: { total?: number; passed?: number; failed?: number; skipped?: number };
  passRate?: number | null;
  testCasesByStatus?: Record<string, number>;
};

export default async function DashboardPage() {
  let projects: Project[] = [];
  let overview: Overview | null = null;
  let error = "";
  try {
    projects = unwrapList<Project>(await api("/projects"));
    if (projects[0]) {
      overview = unwrapObject<Overview>(
        await api(`/projects/${projects[0].id}/overview`),
      );
    }
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load dashboard";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Quality command center</p>
          <h1>Dashboard</h1>
          <p className="lede">
            Current status for the active workspace. Empty metrics stay empty —
            no invented trends.
          </p>
        </div>
      </header>

      {error ? (
        <EmptyState title="Dashboard unavailable" description={error} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create a project to begin importing requirements and generating tests."
          action={
            <Link className="ui-button ui-button--primary" href="/projects">
              Open projects
            </Link>
          }
        />
      ) : (
        <div className="stack-lg">
          <section className="stat-row" aria-label="Run attention">
            <div>
              <span className="stat-label">Requirements</span>
              <strong>{overview?.project?._count?.requirements ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Passed</span>
              <strong>{overview?.totals?.passed ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Failed</span>
              <strong>{overview?.totals?.failed ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Flaky</span>
              <strong>{overview?.testCasesByStatus?.FLAKY ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Quality status</span>
              <strong>
                {overview?.recentRuns?.[0]?.status ? (
                  <Badge
                    tone={
                      overview.recentRuns[0].status === "COMPLETED"
                        ? "success"
                        : overview.recentRuns[0].status === "FAILED"
                          ? "danger"
                          : "info"
                    }
                  >
                    {overview.recentRuns[0].status}
                  </Badge>
                ) : (
                  "No signal"
                )}
              </strong>
            </div>
          </section>

          <section>
            <h2>Projects</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Name</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/projects/${project.id}`}>{project.key}</Link>
                    </td>
                    <td>{project.name}</td>
                    <td>{project.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {(overview?.pendingHealing ?? 0) > 0 || (overview?.totals?.failed ?? 0) > 0 ? (
            <section>
              <h2>Needs attention</h2>
              <ul className="attention-list">
                {(overview?.totals?.failed ?? 0) > 0 ? (
                  <li className="attention-item">
                    <div>
                      <strong>Failed execution results</strong>
                      <p>{overview?.totals?.failed} failed test result(s) need triage.</p>
                    </div>
                  </li>
                ) : null}
                {(overview?.pendingHealing ?? 0) > 0 ? (
                  <li className="attention-item">
                    <div>
                      <strong>Healing proposals</strong>
                      <p>{overview?.pendingHealing} proposal(s) await human review.</p>
                    </div>
                  </li>
                ) : null}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
