"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge, EmptyState, Spinner } from "@testpilot/ui";

import { AppShell } from "@/components/app-shell";
import { api, unwrapList, unwrapObject } from "@/lib/api";

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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const list = unwrapList<Project>(await api("/projects"));
        let nextOverview: Overview | null = null;
        if (list[0]) {
          nextOverview = unwrapObject<Overview>(
            await api(`/projects/${list[0].id}/overview`),
          );
        }
        if (!active) return;
        setProjects(list);
        setOverview(nextOverview);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

      {loading ? (
        <div className="loading-row">
          <Spinner label="Loading dashboard" />
        </div>
      ) : error ? (
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
