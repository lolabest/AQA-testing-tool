"use client";

import { AppShell } from "@/components/app-shell";
import { api, unwrapList, unwrapObject } from "@/lib/api";
import { Button, EmptyState, Field, Input, Select } from "@testpilot/ui";
import { FormEvent, useEffect, useState } from "react";

type CurrentUser = {
  memberships?: Array<{ workspace?: { id?: string } }>;
};
type AiConfig = {
  id: string;
  name: string;
  provider: string;
  model: string;
  enabled: boolean;
  hasCredentials?: boolean;
};

export default function AiSettingsPage() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [provider, setProvider] = useState("mock");
  const [modelId, setModelId] = useState("mock-v1");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const me = unwrapObject<CurrentUser>(await api("/auth/me"));
        const id = me.memberships?.[0]?.workspace?.id ?? "";
        setWorkspaceId(id);
        if (!id) return;
        const list = unwrapList<AiConfig>(
          await api(`/workspaces/${id}/ai-configurations`),
        );
        setConfigs(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load AI settings");
      }
    })();
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!workspaceId) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(`/workspaces/${workspaceId}/ai-configurations`, {
        method: "PUT",
        body: {
          provider,
          modelId,
          apiKey: apiKey || undefined,
          isDefault: true,
          maxTokens: 4096,
          temperature: 0.2,
        },
      });
      setMessage("AI configuration saved. Keys are stored encrypted and never returned.");
      setApiKey("");
      const list = unwrapList<AiConfig>(
        await api(`/workspaces/${workspaceId}/ai-configurations`),
      );
      setConfigs(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Providers</p>
          <h1>AI settings</h1>
          <p className="lede">
            Configure provider and model IDs. API keys never leave the server in plaintext.
          </p>
        </div>
      </header>

      <form className="form-panel" onSubmit={save}>
        <Field label="Provider">
          <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="mock">Mock (local demo)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Google Gemini</option>
            <option value="openai_compatible">OpenAI-compatible</option>
          </Select>
        </Field>
        <Field label="Model ID">
          <Input value={modelId} onChange={(e) => setModelId(e.target.value)} required />
        </Field>
        <Field label="API key" hint="Leave blank to keep the existing encrypted secret.">
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            autoComplete="off"
          />
        </Field>
        {error ? <p className="ui-field-error" role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
        <Button type="submit" busy={busy}>
          Save configuration
        </Button>
      </form>

      <section>
        <h2>Configured providers</h2>
        {configs.length === 0 ? (
          <EmptyState
            title="No configurations"
            description="Save a provider configuration to use AI operations."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Credentials</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.provider}</td>
                  <td>{item.model}</td>
                  <td>{item.hasCredentials ? "Encrypted" : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
