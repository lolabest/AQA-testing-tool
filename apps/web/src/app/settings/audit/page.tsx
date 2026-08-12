"use client";

import { AppShell } from "@/components/app-shell";
import { ResourceError, dateText } from "@/components/data-view";
import { api, unwrapList, unwrapObject } from "@/lib/api";
import { EmptyState } from "@testpilot/ui";
import { useEffect, useState } from "react";

type CurrentUser = {
  memberships?: Array<{ workspace?: { id?: string } }>;
};

type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  actor?: { displayName?: string; email?: string } | null;
};

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const currentUser = unwrapObject<CurrentUser>(await api("/auth/me"));
        const workspaceId = currentUser.memberships?.[0]?.workspace?.id;
        if (!workspaceId) {
          throw new Error("No active workspace membership was found.");
        }
        const nextEvents = unwrapList<AuditEvent>(
          await api(`/workspaces/${workspaceId}/audit-log?page=1&pageSize=50`),
        );
        if (active) setEvents(nextEvents);
      } catch (caught) {
        if (active) {
          setError(
            caught instanceof Error ? caught.message : "Could not load the audit log.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [revision]);

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Audit log</h1>
          <p className="lede">Security-relevant actions recorded for this workspace.</p>
        </div>
      </header>
      {loading ? (
        <p className="subtle">Loading audit log…</p>
      ) : error ? (
        <ResourceError message={error} retry={() => setRevision((value) => value + 1)} />
      ) : events.length === 0 ? (
        <EmptyState
          title="No audit events"
          description="Recorded workspace activity will appear here."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td>{dateText(event.createdAt)}</td>
                <td>{event.actor?.displayName ?? event.actor?.email ?? "System"}</td>
                <td className="mono">{event.action}</td>
                <td>{event.entityType}</td>
                <td className="mono">{event.entityId?.slice(0, 12) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
