import type { Role } from "./types.js";

export type Permission =
  | "workspace:manage"
  | "members:manage"
  | "project:create"
  | "project:update"
  | "project:delete"
  | "environment:manage"
  | "secrets:manage"
  | "requirement:manage"
  | "test:generate"
  | "test:approve"
  | "test:execute"
  | "test:execute:destructive"
  | "healing:approve"
  | "ai:configure"
  | "schedule:manage"
  | "audit:read"
  | "run:cancel"
  | "project:read"
  | "run:read";

const ALL: Permission[] = [
  "workspace:manage",
  "members:manage",
  "project:create",
  "project:update",
  "project:delete",
  "environment:manage",
  "secrets:manage",
  "requirement:manage",
  "test:generate",
  "test:approve",
  "test:execute",
  "test:execute:destructive",
  "healing:approve",
  "ai:configure",
  "schedule:manage",
  "audit:read",
  "run:cancel",
  "project:read",
  "run:read",
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: ALL,
  ADMIN: ALL.filter((p) => p !== "workspace:manage"),
  QA_ENGINEER: [
    "project:read",
    "project:update",
    "requirement:manage",
    "test:generate",
    "test:approve",
    "test:execute",
    "test:execute:destructive",
    "healing:approve",
    "schedule:manage",
    "run:cancel",
    "run:read",
    "audit:read",
  ],
  DEVELOPER: [
    "project:read",
    "requirement:manage",
    "test:generate",
    "test:execute",
    "run:read",
    "run:cancel",
  ],
  VIEWER: ["project:read", "run:read"],
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertPermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new AuthorizationError(`Role ${role} lacks permission ${permission}`);
  }
}

export class AuthorizationError extends Error {
  readonly code = "AUTHORIZATION_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
