"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, Status, useApiList } from "@/components/data-view";
import { EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type Failure = {
  id: string;
  classification: string;
  confidence: number;
  summary: string;
  rootCause?: string | null;
  reviewedAt?: string | null;
  testResult?: {
    testRun?: { id?: string };
    testCase?: { key?: string; title?: string };
  };
};

export default function FailureTriagePage() {
  const { id, runId } = useParams<{ id: string; runId: string }>();
  const failureAnalyses = useApiList<Failure>(`/projects/${id}/failure-analyses`);
  const failures =
    failureAnalyses.data?.filter(
      (failure) => failure.testResult?.testRun?.id === runId,
    ) ?? [];

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Run {runId.slice(0, 8)}</p>
          <h1>Failure triage</h1>
          <p className="lede">
            AI classifications are recommendations; evidence remains available for review.
          </p>
        </div>
      </header>
      {failureAnalyses.loading ? (
        <p className="subtle">Loading failure analyses…</p>
      ) : failureAnalyses.error ? (
        <ResourceError
          message={failureAnalyses.error}
          retry={failureAnalyses.reload}
        />
      ) : failures.length === 0 ? (
        <EmptyState
          title="No failures to triage"
          description="This run has no persisted failure analyses."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Test case</th>
              <th>Classification</th>
              <th>Confidence</th>
              <th>Summary</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {failures.map((failure) => (
              <tr key={failure.id}>
                <td>
                  <strong>{failure.testResult?.testCase?.key ?? "Unknown"}</strong>
                  <div className="subtle">{failure.testResult?.testCase?.title}</div>
                </td>
                <td>
                  <Status value={failure.classification} />
                </td>
                <td>{Math.round(failure.confidence * 100)}%</td>
                <td>
                  {failure.summary}
                  {failure.rootCause ? (
                    <div className="subtle">{failure.rootCause}</div>
                  ) : null}
                </td>
                <td>{failure.reviewedAt ? "Reviewed" : "Pending"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
