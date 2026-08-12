"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@testpilot/ui";

import { api, unwrapObject } from "@/lib/api";
import {
  clearClientAccessToken,
  getClientAccessToken,
  signInRedirectPath,
} from "@/lib/client-session";

type CurrentUser = {
  displayName?: string;
  memberships?: Array<{ workspace?: { name?: string } }>;
};

type NavItem = {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
};

const workspaceItems: NavItem[] = [
  { label: "Overview", href: "/", icon: "◫", exact: true },
  { label: "Projects", href: "/projects", icon: "▦" },
];

const settingsItems: NavItem[] = [
  { label: "AI providers", href: "/settings/ai", icon: "◇" },
  { label: "Members", href: "/settings/members", icon: "◎" },
  { label: "Audit log", href: "/settings/audit", icon: "≡" },
];

const projectSections = [
  ["Overview", ""],
  ["Requirements", "requirements"],
  ["Coverage", "coverage"],
  ["Test plans", "test-plans"],
  ["Test cases", "test-cases"],
  ["Suites", "suites"],
  ["Environments", "environments"],
  ["Schedules", "schedules"],
  ["Healing", "healing"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [apiStatus, setApiStatus] = useState<"checking" | "connected" | "unavailable">(
    "checking",
  );
  const [signingOut, setSigningOut] = useState(false);

  const projectId = useMemo(() => {
    const match = pathname.match(/^\/projects\/([^/]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : undefined;
  }, [pathname]);

  useEffect(() => {
    if (!getClientAccessToken()) {
      window.location.assign(signInRedirectPath());
      return;
    }

    let active = true;
    api<CurrentUser>("/auth/me")
      .then((payload) => {
        const result = unwrapObject<CurrentUser>(payload);
        const name = result.memberships?.[0]?.workspace?.name;
        if (active && name) setWorkspaceName(name);
        if (active) setApiStatus("connected");
      })
      .catch(() => {
        if (active) setApiStatus("unavailable");
      });
    return () => {
      active = false;
    };
  }, []);

  const projectItems: NavItem[] = projectId
    ? [
        ...projectSections.map(([label, section]) => ({
          label,
          href: `/projects/${projectId}${section ? `/${section}` : ""}`,
          icon: section ? "·" : "⌂",
          exact: section === "",
        })),
        {
          label: "Application map",
          href: `/application-map?projectId=${encodeURIComponent(projectId)}`,
          icon: "⌘",
        },
      ]
    : [];

  function isActive(item: NavItem) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      clearClientAccessToken();
      window.location.assign(signInRedirectPath());
    }
  }

  function nav(items: NavItem[]) {
    return items.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className={`nav-link ${isActive(item) ? "nav-link--active" : ""}`}
      >
        <span className="nav-icon" aria-hidden="true">
          {item.icon}
        </span>
        {item.label}
      </Link>
    ));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="TestPilot AI home">
          <span className="brand-mark" aria-hidden="true" />
          TestPilot AI
        </Link>
        <div className="sidebar-context">
          <p className="eyebrow">Workspace</p>
          <strong>{workspaceName}</strong>
        </div>
        <nav className="sidebar-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {nav(workspaceItems)}
          {projectItems.length > 0 ? (
            <>
              <span className="nav-label">Current project</span>
              {nav(projectItems)}
            </>
          ) : null}
          <span className="nav-label">Administration</span>
          {nav(settingsItems)}
        </nav>
        <div className="sidebar-footer">
          <Button variant="ghost" onClick={signOut} busy={signingOut}>
            Sign out
          </Button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div>
            <span className="workspace-label">Active workspace</span>
            <span className="workspace-name">{workspaceName}</span>
          </div>
          <div className="topbar-actions">
            <span
              className={`connection-dot connection-dot--${apiStatus}`}
              aria-hidden="true"
            />
            <span className="subtle">
              {apiStatus === "connected"
                ? "API connected"
                : apiStatus === "unavailable"
                  ? "API unavailable"
                  : "Checking API"}
            </span>
          </div>
        </header>
        <main>
          <div className="page">{children}</div>
        </main>
      </div>
    </div>
  );
}
