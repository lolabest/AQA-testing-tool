"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@testpilot/ui";

export function GeneratePlanButton({
  projectId,
  requirementIds,
}: {
  projectId: string;
  requirementIds: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${projectId}/test-plans/generate`, {
        method: "POST",
        body: { requirementIds, includeDiscovery: false },
      });
      router.push(`/projects/${projectId}/test-cases`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button busy={busy} onClick={() => void generate()}>
        Generate test plan
      </Button>
      {error ? (
        <p className="ui-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
