"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@testpilot/ui";

export function TestCaseActions({
  projectId,
  testCaseId,
  status,
}: {
  projectId: string;
  testCaseId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"approve" | "compile" | null>(null);
  const [error, setError] = useState("");

  async function run(action: "approve" | "compile") {
    setBusy(action);
    setError("");
    try {
      if (action === "approve" && (status === "DRAFT" || status === "GENERATED")) {
        await api(`/test-cases/${testCaseId}/validate`, {
          method: "POST",
          body: {},
        });
      }
      await api(`/test-cases/${testCaseId}/${action}`, {
        method: "POST",
        body: action === "approve" ? { note: "Approved from UI" } : {},
      });
      router.refresh();
      if (action === "compile") {
        router.push(`/projects/${projectId}/runs/new`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="button-row">
      <Button
        variant="secondary"
        busy={busy === "approve"}
        disabled={status === "APPROVED" || status === "ACTIVE"}
        onClick={() => void run("approve")}
      >
        Approve
      </Button>
      <Button
        busy={busy === "compile"}
        disabled={status !== "APPROVED" && status !== "ACTIVE"}
        onClick={() => void run("compile")}
      >
        Compile
      </Button>
      {error ? (
        <span className="ui-field-error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
