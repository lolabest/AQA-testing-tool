"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, useApiList } from "@/components/data-view";
import { HealingActions } from "@/components/healing-actions";
import { Badge, EmptyState } from "@testpilot/ui";
import { useParams } from "next/navigation";

type Proposal = {
  id: string;
  status: string;
  rationale: string;
  confidence: number;
  riskLevel: string;
};

export default function HealingPage() {
  const { id } = useParams<{ id: string }>();
  const proposals = useApiList<Proposal>(`/projects/${id}/healing-proposals`);

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
      {proposals.loading ? (
        <p className="subtle">Loading healing proposals…</p>
      ) : proposals.error ? (
        <ResourceError message={proposals.error} retry={proposals.reload} />
      ) : !proposals.data?.length ? (
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
            {proposals.data.map((item) => (
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
