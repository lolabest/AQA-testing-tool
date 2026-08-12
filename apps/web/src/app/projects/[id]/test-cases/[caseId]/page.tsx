"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, Status, useApiObject } from "@/components/data-view";
import { TestCaseActions } from "@/components/test-case-actions";
import { EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type TestCaseDetail = {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  status: string;
  riskLevel: string;
  currentVersion: number;
  intent: unknown;
  requirement?: { key?: string; title?: string } | null;
  testPlan?: { name?: string } | null;
  versions?: Array<{
    revision: number;
    compiledCode?: string | null;
    compilerVersion?: string | null;
    compiledChecksum?: string | null;
  }>;
};

export default function TestCaseDetailPage() {
  const { id, caseId } = useParams<{ id: string; caseId: string }>();
  const testCase = useApiObject<TestCaseDetail>(`/test-cases/${caseId}`);

  if (testCase.loading) {
    return (
      <AppShell>
        <p className="subtle">Loading test case…</p>
      </AppShell>
    );
  }

  if (testCase.error) {
    return (
      <AppShell>
        <ResourceError message={testCase.error} retry={testCase.reload} />
      </AppShell>
    );
  }

  if (!testCase.data) {
    return (
      <AppShell>
        <EmptyState
          title="Test case unavailable"
          description="The requested test case was not found."
        />
      </AppShell>
    );
  }

  const detail = testCase.data;
  const currentVersion =
    detail.versions?.find((version) => version.revision === detail.currentVersion) ??
    detail.versions?.[0];

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">{detail.key}</p>
          <h1>{detail.title}</h1>
          <p className="lede">
            {detail.description ?? "Review the structured intent before approval."}
          </p>
        </div>
        <TestCaseActions
          projectId={id}
          testCaseId={caseId}
          status={detail.status}
        />
      </header>

      <div className="editor-layout">
        <section>
          <div className="section-heading">
            <div>
              <h2>Structured test intent</h2>
              <p>Version {detail.currentVersion}; edits require a versioned API update.</p>
            </div>
          </div>
          <textarea
            className="code-editor"
            aria-label="Structured test intent"
            value={JSON.stringify(detail.intent, null, 2)}
            readOnly
          />
        </section>
        <aside>
          <div className="section-heading">
            <h2>Details</h2>
          </div>
          <dl className="detail-list">
            <div className="detail-row">
              <dt>Status</dt>
              <dd>
                <Status value={detail.status} />
              </dd>
            </div>
            <div className="detail-row">
              <dt>Risk</dt>
              <dd>
                <Status value={detail.riskLevel} />
              </dd>
            </div>
            <div className="detail-row">
              <dt>Requirement</dt>
              <dd>{detail.requirement?.key ?? "Unlinked"}</dd>
            </div>
            <div className="detail-row">
              <dt>Test plan</dt>
              <dd>{detail.testPlan?.name ?? "Unlinked"}</dd>
            </div>
            <div className="detail-row">
              <dt>Compiler</dt>
              <dd>{currentVersion?.compilerVersion ?? "Not compiled"}</dd>
            </div>
            <div className="detail-row">
              <dt>Checksum</dt>
              <dd className="mono">
                {currentVersion?.compiledChecksum?.slice(0, 12) ?? "—"}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {currentVersion?.compiledCode ? (
        <section className="section">
          <div className="section-heading">
            <h2>Compiled Playwright</h2>
          </div>
          <pre className="code-block">{currentVersion.compiledCode}</pre>
        </section>
      ) : null}
    </AppShell>
  );
}
