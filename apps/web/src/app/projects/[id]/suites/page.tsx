import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { unwrapList } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

type Suite = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  status: string;
  items?: Array<{ id: string; enabled: boolean }>;
};

export default async function SuitesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let suites: Suite[] = [];
  let error = "";
  try {
    suites = unwrapList<Suite>(await serverApi(`/projects/${id}/suites`));
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load suites.";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution groups</p>
          <h1>Test suites</h1>
          <p className="lede">Executable suites composed of reviewed test cases.</p>
        </div>
      </header>
      {error ? (
        <EmptyState title="Suites unavailable" description={error} />
      ) : suites.length === 0 ? (
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
            {suites.map((suite) => (
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
