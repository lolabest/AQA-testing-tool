import { AppShell } from "@/components/app-shell";
import { HealingActions } from "@/components/healing-actions";
import { unwrapList } from "@/lib/api";
import { serverApi as api } from "@/lib/server-api";
import { Badge, EmptyState } from "@testpilot/ui";

export const dynamic = "force-dynamic";

type Proposal = {
  id: string;
  status: string;
  rationale: string;
  confidence: number;
  riskLevel: string;
};

export default async function HealingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let proposals: Proposal[] = [];
  let error = "";
  try {
    proposals = unwrapList<Proposal>(
      await api(`/projects/${id}/healing-proposals`),
    );
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load proposals";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Safe self-healing</p>
          <h1>Healing proposals</h1>
          <p className="lede">
            Proposals never auto-apply. Review evidence, then approve or reject.
          </p>
        </div>
      </header>
      {error ? (
        <EmptyState title="Unable to load proposals" description={error} />
      ) : proposals.length === 0 ? (
        <EmptyState
          title="No proposals"
          description="Healing proposals appear after failure triage suggests a safe locator or route change."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Confidence</th>
              <th>Risk</th>
              <th>Rationale</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((item) => (
              <tr key={item.id}>
                <td>
                  <Badge>{item.status}</Badge>
                </td>
                <td>{Math.round(item.confidence * 100)}%</td>
                <td>{item.riskLevel}</td>
                <td>{item.rationale}</td>
                <td>
                  {item.status === "PENDING" ? (
                    <HealingActions proposalId={item.id} />
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
