import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditParams {
  salonId: string;
  masterId: string;
  masterName?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry for a staff/master action.
 * Fire-and-forget — never throws.
 */
export async function staffAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        salonId: params.salonId,
        actorType: 'master',
        actorId: params.masterId,
        actorName: params.masterName || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        entityName: params.entityName || null,
        changes: params.changes ? (params.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (error) {
    console.error('Audit log write failed:', error);
    // Never throw — audit logging is best-effort
  }
}
