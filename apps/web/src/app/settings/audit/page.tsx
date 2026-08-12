import { AppShell } from "@/components/app-shell";
import { dateText } from "@/components/data-view";
import { unwrapList, unwrapObject } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

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

export default async function AuditPage() {
  let events: AuditEvent[] = [];
  let error = "";
  try {
    const currentUser = unwrapObject<CurrentUser>(await serverApi("/auth/me"));
    const workspaceId = currentUser.memberships?.[0]?.workspace?.id;
    if (!workspaceId) throw new Error("No active workspace membership was found.");
    events = unwrapList<AuditEvent>(
      await serverApi(`/workspaces/${workspaceId}/audit-log?page=1&pageSize=50`),
    );
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load the audit log.";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">Governance</p>
          <h1>Audit log</h1>
          <p className="lede">Security-relevant actions recorded for this workspace.</p>
        </div>
      </header>
      {error ? (
        <EmptyState title="Audit log unavailable" description={error} />
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
