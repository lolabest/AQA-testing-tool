import { AppShell } from "@/components/app-shell";
import { Status } from "@/components/data-view";
import { unwrapList, unwrapObject } from "@/lib/api";
import { serverApi } from "@/lib/server-api";
import { EmptyState } from "@testpilot/ui";

type CurrentUser = {
  memberships?: Array<{ workspace?: { id?: string; name?: string } }>;
};

type Member = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    active: boolean;
  };
};

export default async function MembersPage() {
  let members: Member[] = [];
  let workspaceName = "Workspace";
  let error = "";
  try {
    const currentUser = unwrapObject<CurrentUser>(await serverApi("/auth/me"));
    const workspace = currentUser.memberships?.[0]?.workspace;
    workspaceName = workspace?.name ?? workspaceName;
    if (!workspace?.id) throw new Error("No active workspace membership was found.");
    members = unwrapList<Member>(
      await serverApi(`/workspaces/${workspace.id}/members`),
    );
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Could not load members.";
  }

  return (
    <AppShell>
      <header className="page-header">
        <div>
          <p className="eyebrow">{workspaceName}</p>
          <h1>Members</h1>
          <p className="lede">Workspace access and assigned quality roles.</p>
        </div>
      </header>
      {error ? (
        <EmptyState title="Members unavailable" description={error} />
      ) : members.length === 0 ? (
        <EmptyState
          title="No members"
          description="No active memberships were returned for this workspace."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.user.displayName}</strong>
                </td>
                <td>{member.user.email}</td>
                <td>
                  <Status value={member.role} />
                </td>
                <td>{member.user.active ? "Active" : "Disabled"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </AppShell>
  );
}
