"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@testpilot/ui";

export function HealingActions({ proposalId }: { proposalId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState("");

  async function decide(decision: "APPROVE" | "REJECT") {
    setBusy(decision);
    setError("");
    try {
      await api(`/healing-proposals/${proposalId}/decision`, {
        method: "POST",
        body: { decision, note: `UI ${decision.toLowerCase()}` },
      }).catch(async () =>
        api(`/healing/${proposalId}/decision`, {
          method: "POST",
          body: { decision, note: `UI ${decision.toLowerCase()}` },
        }),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="button-row">
      <Button
        busy={busy === "APPROVE"}
        onClick={() => void decide("APPROVE")}
      >
        Approve
      </Button>
      <Button
        variant="danger"
        busy={busy === "REJECT"}
        onClick={() => void decide("REJECT")}
      >
        Reject
      </Button>
      {error ? (
        <span className="ui-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
