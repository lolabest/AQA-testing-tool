"use client";

import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { api, unwrapList } from "@/lib/api";
import { Button, EmptyState, Field, Input, Select, Spinner } from "@testpilot/ui";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Environment = {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  isDefault: boolean;
  updatedAt: string;
};

export default function EnvironmentsPage() {
  const projectId = useParams<{ id: string }>().id;
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setEnvironments(
        unwrapList<Environment>(await api(`/projects/${projectId}/environments`)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load environments.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const baseUrl = String(form.get("baseUrl"));
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${projectId}/environments`, {
        method: "POST",
        body: {
          name: form.get("name"),
          kind: form.get("kind"),
          baseUrl,
          allowedDomains: String(form.get("allowedDomains"))
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          authStrategy: form.get("authStrategy"),
          browserProjects: ["chromium"],
          parallelismLimit: 2,
          timeoutMs: 30000,
          allowDestructiveTests: false,
        },
      });
      event.currentTarget.reset();
      setShowForm(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create environment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Execution policy</p>
          <h1>Environments</h1>
          <p className="lede">Base URLs, domain allowlists, and authentication boundaries.</p>
        </div>
        <Button onClick={() => setShowForm((value) => !value)}>
          {showForm ? "Cancel" : "New environment"}
        </Button>
      </header>

      {showForm ? (
        <form className="form-panel" onSubmit={create}>
          <Field label="Name">
            <Input name="name" minLength={2} maxLength={80} required />
          </Field>
          <Field label="Kind">
            <Select name="kind" defaultValue="TEST">
              <option value="LOCAL">Local</option>
              <option value="TEST">Test</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION_LIKE">Production-like</option>
            </Select>
          </Field>
          <Field label="Base URL">
            <Input name="baseUrl" type="url" placeholder="https://staging.example.com" required />
          </Field>
          <Field label="Allowed domains" hint="Comma-separated hostnames permitted during execution.">
            <Input name="allowedDomains" placeholder="staging.example.com" required />
          </Field>
          <Field label="Authentication">
            <Select name="authStrategy" defaultValue="NONE">
              <option value="NONE">None</option>
              <option value="FORM">Form</option>
              <option value="BASIC">Basic</option>
              <option value="BEARER">Bearer</option>
              <option value="STORAGE_STATE">Storage state</option>
            </Select>
          </Field>
          <Button type="submit" busy={busy}>
            Save environment
          </Button>
        </form>
      ) : null}

      {error ? (
        <div className="error-banner" role="alert">
          {error}
        </div>
      ) : null}
      {loading ? (
        <Spinner label="Loading environments…" />
      ) : environments.length === 0 ? (
        <EmptyState
          title="No environments"
          description="Add an authorized target before creating a run."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Kind</th>
              <th>Base URL</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            {environments.map((environment) => (
              <tr key={environment.id}>
                <td>
                  <strong>{environment.name}</strong>
                </td>
                <td>
                  <Status value={environment.kind} />
                </td>
                <td className="mono">{environment.baseUrl}</td>
                <td>{environment.isDefault ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
