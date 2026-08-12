import type { FastifyReply, FastifyRequest } from "fastify";
import type { Permission, Role } from "@testpilot/domain";
import { assertPermission, hasPermission } from "@testpilot/domain";
import { prisma } from "@testpilot/database";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface RequestAuthContext {
  user: AuthUser;
  workspaceId: string;
  role: Role;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    auth?: RequestAuthContext;
    correlationId: string;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthContext> {
  try {
    await request.jwtVerify();
  } catch {
    reply.code(401).send({ error: "unauthorized" });
    throw new Error("unauthorized");
  }

  const userId = request.user.sub;
  const workspaceHeader = request.headers["x-workspace-id"];
  const workspaceId =
    typeof workspaceHeader === "string" && workspaceHeader.length > 0
      ? workspaceHeader
      : undefined;

  const memberships = await prisma.membership.findMany({
    where: { userId, deletedAt: null },
    include: {
      workspace: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    reply.code(403).send({ error: "no_workspace_membership" });
    throw new Error("no_workspace_membership");
  }

  const membership =
    (workspaceId
      ? memberships.find((m) => m.workspaceId === workspaceId)
      : memberships[0]) ?? null;

  if (!membership) {
    reply.code(403).send({ error: "workspace_forbidden" });
    throw new Error("workspace_forbidden");
  }

  const auth: RequestAuthContext = {
    user: {
      id: membership.user.id,
      email: membership.user.email,
      displayName: membership.user.displayName,
    },
    workspaceId: membership.workspaceId,
    role: membership.role as Role,
  };
  request.auth = auth;
  return auth;
}

export function requirePermission(permission: Permission) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const auth = request.auth ?? (await requireAuth(request, reply));
    if (!hasPermission(auth.role, permission)) {
      reply.code(403).send({
        error: "forbidden",
        permission,
        role: auth.role,
      });
      throw new Error("forbidden");
    }
    assertPermission(auth.role, permission);
  };
}

export async function assertProjectAccess(
  projectId: string,
  workspaceId: string,
) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId, deletedAt: null },
  });
  if (!project) {
    const err = new Error("project_not_found");
    (err as Error & { statusCode?: number }).statusCode = 404;
    throw err;
  }
  return project;
}
