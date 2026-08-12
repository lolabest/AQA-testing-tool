import { prisma } from "@testpilot/database";
import { redactObject } from "@testpilot/security";

export async function writeAudit(input: {
  workspaceId: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  return prisma.auditEvent.create({
    data: {
      workspaceId: input.workspaceId,
      actorId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: redactObject(input.metadata ?? {}) as object,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}
