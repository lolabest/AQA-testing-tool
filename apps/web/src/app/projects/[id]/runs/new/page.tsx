"use client";

import { AppShell } from "@/components/app-shell";
import { api, unwrapList, unwrapObject } from "@/lib/api";
import { Button, EmptyState, Field, Select } from "@testpilot/ui";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Environment = { id: string; name: string; baseUrl: string };
type Suite = { id: string; name: string };
type TestCase = { id: string; status: string };

export default function NewRunPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const router = useRouter();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [suites, setSuites] = useState<Suite[]>([]);
  const [testCaseIds, setTestCaseIds] = useState<string[]>([]);
  const [environmentId, setEnvironmentId] = useState("");
  const [suiteId, setSuiteId] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [envPayload, suitePayload, testCasePayload] = await Promise.all([
          api(`/projects/${projectId}/environments`),
          api(`/projects/${projectId}/suites`),
          api(`/projects/${projectId}/test-cases`),
        ]);
        const envs = unwrapList<Environment>(envPayload);
        const nextSuites = unwrapList<Suite>(suitePayload);
        setEnvironments(envs);
        setSuites(nextSuites);
        setTestCaseIds(
          unwrapList<TestCase>(testCasePayload)
            .filter((item) => item.status === "APPROVED" || item.status === "ACTIVE")
            .map((item) => item.id),
        );
        setEnvironmentId(envs[0]?.id ?? "");
        setSuiteId(nextSuites[0]?.id ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load run form");
      }
    })();
  }, [projectId]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const run = unwrapObject<{ id: string }>(
        await api(`/projects/${projectId}/runs`, {
          method: "POST",
          body: {
            environmentId,
            suiteId: suiteId || undefined,
            testCaseIds: suiteId ? undefined : testCaseIds,
            browsers: ["chromium"],
            allowDestructive: false,
          },
        }),
      );
      router.push(`/projects/${projectId}/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start run");
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution</p>
          <h1>Create run</h1>
        </div>
      </header>
      {environments.length === 0 && !error ? (
        <EmptyState
          title="No environments"
          description="Configure an environment before starting a run."
        />
      ) : (
        <form className="form-panel" onSubmit={submit}>
          <Field label="Environment">
            <Select
              value={environmentId}
              onChange={(event) => setEnvironmentId(event.target.value)}
              required
            >
              {environments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.baseUrl})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Suite (optional)">
            <Select
              value={suiteId}
              onChange={(event) => setSuiteId(event.target.value)}
            >
              <option value="">Approved cases in project</option>
              {suites.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </Select>
          </Field>
          {error ? (
            <p className="ui-field-error" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" busy={busy}>
            Start run
          </Button>
        </form>
      )}
    </AppShell>
  );
}
