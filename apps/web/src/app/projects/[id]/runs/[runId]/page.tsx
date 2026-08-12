"use client";

import { AppShell } from "@/components/app-shell";
import { api, eventStreamUrl, unwrapObject } from "@/lib/api";
import { Badge, EmptyState } from "@testpilot/ui";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Run = {
  id: string;
  status: string;
  passedTests?: number;
  failedTests?: number;
  skippedTests?: number;
  summary?: { passed?: number; failed?: number; flaky?: number };
  results?: Array<{ id: string; outcome: string; summary?: string | null }>;
  artifacts?: Array<{ id: string; kind: string; name: string; storageUrl: string }>;
};

export default function LiveRunPage() {
  const params = useParams<{ id: string; runId: string }>();
  const [run, setRun] = useState<Run | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const payload = unwrapObject<Run>(await api(`/runs/${params.runId}`));
        if (active) setRun(payload);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load run");
        }
      }
    })();

    const source = new EventSource(eventStreamUrl(`/runs/${params.runId}/events`));
    source.onmessage = (message) => {
      setEvents((current) => [message.data, ...current].slice(0, 40));
      try {
        const parsed = JSON.parse(message.data) as {
          type?: string;
          status?: string;
          run?: Run;
        };
        if (parsed.run) setRun(parsed.run);
        if (parsed.status) {
          setRun((current) =>
            current ? { ...current, status: parsed.status! } : current,
          );
        }
      } catch {
        // keep raw event text
      }
    };
    source.onerror = () => {
      source.close();
    };
    return () => {
      active = false;
      source.close();
    };
  }, [params.runId]);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Live execution</p>
          <h1>Run {params.runId.slice(0, 8)}</h1>
        </div>
        <Link
          className="ui-button ui-button--secondary"
          href={`/projects/${params.id}/runs/${params.runId}/failures`}
        >
          Failure triage
        </Link>
      </header>
      {error ? (
        <EmptyState title="Run unavailable" description={error} />
      ) : !run ? (
        <p>Loading run…</p>
      ) : (
        <div className="stack-lg">
          <section className="stat-row">
            <div>
              <span className="stat-label">Status</span>
              <strong>
                <Badge>{run.status}</Badge>
              </strong>
            </div>
            <div>
              <span className="stat-label">Passed</span>
              <strong>{run.summary?.passed ?? run.passedTests ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Failed</span>
              <strong>{run.summary?.failed ?? run.failedTests ?? 0}</strong>
            </div>
            <div>
              <span className="stat-label">Flaky</span>
              <strong>{run.summary?.flaky ?? 0}</strong>
            </div>
          </section>

          <section>
            <h2>Results</h2>
            {(run.results?.length ?? 0) === 0 ? (
              <EmptyState
                title="No results yet"
                description="Results appear as the worker reports attempts."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Outcome</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {run.results?.map((result) => (
                    <tr key={result.id}>
                      <td>
                        <Badge>{result.outcome}</Badge>
                      </td>
                      <td>{result.summary ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Artifacts</h2>
            {(run.artifacts?.length ?? 0) === 0 ? (
              <EmptyState
                title="No artifacts"
                description="Screenshots, traces, and logs appear after collection."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Kind</th>
                    <th>Name</th>
                    <th>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {run.artifacts?.map((artifact) => (
                    <tr key={artifact.id}>
                      <td>{artifact.kind}</td>
                      <td>{artifact.name}</td>
                      <td>
                        <code>{artifact.storageUrl}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h2>Event stream</h2>
            <pre className="event-log">{events.join("\n") || "Waiting for events…"}</pre>
          </section>
        </div>
      )}
    </AppShell>
  );
}
