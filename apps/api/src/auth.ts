import { createHash } from "node:crypto";
import type { PrismaClient } from "@testpilot/database";
import {
  assertPermission,
  AuthorizationError,
  type Permission,
  type Role,
} from "@testpilot/domain";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AuthClaims {
  sub: string;
  workspaceId: string;
  membershipId: string;
  role: Role;
  sessionId: string;
}

export interface AuthContext {
  userId: string;
  workspaceId: string;
  membershipId: string;
  role: Role;
  sessionId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthenticateHook(prisma: PrismaClient) {
  return async function authenticate(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    let claims: AuthClaims;
    try {
      claims = await request.jwtVerify<AuthClaims>();
    } catch {
      throw new HttpError(401, "Authentication is required", "UNAUTHORIZED");
    }

    const session = await prisma.session.findFirst({
      where: {
        id: claims.sessionId,
        userId: claims.sub,
        workspaceId: claims.workspaceId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (!session) {
      throw new HttpError(401, "Session is invalid or expired", "INVALID_SESSION");
    }

    const membership = await prisma.membership.findFirst({
      where: {
        id: claims.membershipId,
        userId: claims.sub,
        workspaceId: claims.workspaceId,
        deletedAt: null,
        user: { active: true, deletedAt: null },
      },
      select: { role: true },
    });
    if (!membership) {
      throw new HttpError(401, "Workspace membership is unavailable", "INVALID_MEMBERSHIP");
    }

    request.authContext = {
      userId: claims.sub,
      workspaceId: claims.workspaceId,
      membershipId: claims.membershipId,
      role: membership.role as Role,
      sessionId: claims.sessionId,
    };

    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  };
}

export function requirePermission(permission: Permission) {
  return async function authorize(request: FastifyRequest): Promise<void> {
    try {
      assertPermission(request.authContext.role, permission);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw new HttpError(403, error.message, error.code);
      }
      throw error;
    }
  };
}
