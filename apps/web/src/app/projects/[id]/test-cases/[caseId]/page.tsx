import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { TestCaseActions } from "@/components/test-case-actions";
import { unwrapObject } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

export const dynamic = "force-dynamic";

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

export default async function TestCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = await params;
  let testCase: TestCaseDetail | null = null;
  let error = "";
  try {
    testCase = unwrapObject<TestCaseDetail>(await serverApi(`/test-cases/${caseId}`));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load the test case.";
  }

  if (error || !testCase) {
    return (
      <AppShell>
        <EmptyState
          title="Test case unavailable"
          description={error || "The requested test case was not found."}
        />
      </AppShell>
    );
  }

  const currentVersion =
    testCase.versions?.find((version) => version.revision === testCase.currentVersion) ??
    testCase.versions?.[0];

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">{testCase.key}</p>
          <h1>{testCase.title}</h1>
          <p className="lede">
            {testCase.description ?? "Review the structured intent before approval."}
          </p>
        </div>
        <TestCaseActions
          projectId={id}
          testCaseId={caseId}
          status={testCase.status}
        />
      </header>

      <div className="editor-layout">
        <section>
          <div className="section-heading">
            <div>
              <h2>Structured test intent</h2>
              <p>Version {testCase.currentVersion}; edits require a versioned API update.</p>
            </div>
          </div>
          <textarea
            className="code-editor"
            aria-label="Structured test intent"
            value={JSON.stringify(testCase.intent, null, 2)}
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
                <Status value={testCase.status} />
              </dd>
            </div>
            <div className="detail-row">
              <dt>Risk</dt>
              <dd>
                <Status value={testCase.riskLevel} />
              </dd>
            </div>
            <div className="detail-row">
              <dt>Requirement</dt>
              <dd>{testCase.requirement?.key ?? "Unlinked"}</dd>
            </div>
            <div className="detail-row">
              <dt>Test plan</dt>
              <dd>{testCase.testPlan?.name ?? "Unlinked"}</dd>
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
