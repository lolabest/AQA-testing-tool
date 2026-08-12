import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { unwrapList } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

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

export default async function FailureTriagePage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const { id, runId } = await params;
  let failures: Failure[] = [];
  let error = "";
  try {
    failures = unwrapList<Failure>(
      await serverApi(`/projects/${id}/failure-analyses`),
    ).filter((failure) => failure.testResult?.testRun?.id === runId);
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load failure analyses.";
  }

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
      {error ? (
        <EmptyState title="Triage unavailable" description={error} />
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
