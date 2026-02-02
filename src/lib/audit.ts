import { prisma } from './prisma';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

interface AuditLogParams {
  salonId: string;
  actorType: 'admin' | 'master' | 'system';
  actorId?: string;
  actorName?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityName?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAudit(params: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        salonId: params.salonId,
        actorType: params.actorType,
        actorId: params.actorId,
        actorName: params.actorName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entityName: params.entityName,
        changes: params.changes,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Не бросаем ошибку чтобы не ломать основной flow
  }
}

// Хелпер для создания уведомления
interface NotificationParams {
  salonId: string;
  recipientType?: 'admin' | 'master';
  recipientId?: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export async function createNotification(params: NotificationParams) {
  try {
    await prisma.notification.create({
      data: {
        salonId: params.salonId,
        recipientType: params.recipientType || 'admin',
        recipientId: params.recipientId,
        type: params.type,
        title: params.title,
        message: params.message,
        entityType: params.entityType,
        entityId: params.entityId,
      },
    });
  } catch (error) {
    console.error('Notification create error:', error);
  }
}
