import { Request } from 'express';
import { prisma } from '../config/prisma';

export type AuditAction =
  | 'organization.created'
  | 'organization.updated'
  | 'organization.suspended'
  | 'organization.reactivated'
  | 'organization.deleted'
  | 'organization.exported'
  | 'user.updated'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.deleted'
  | 'user.password_reset'
  | 'user.impersonated'
  | 'impersonation.ended';

type AuditContext = {
  targetType?: string;
  targetId?: string;
  targetName?: string;
  organizationId?: string;
  organizationName?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Registra una acción en la tabla audit_logs.
 * Nunca lanza errores: si falla el logging, no debe romper la operación principal.
 */
export const auditLog = async (
  req: Request,
  action: AuditAction,
  context: AuditContext = {},
): Promise<void> => {
  try {
    if (!req.user?.isSuperAdmin) return; // Solo logueamos acciones de super-admins

    const actorUserId = req.user.userId;
    const actorEmail = (req.user as { email?: string }).email || 'unknown';
    const ipAddress = req.ip || req.socket.remoteAddress || null;
    const userAgent = req.header('user-agent') || null;

    await prisma.$executeRawUnsafe(
      `INSERT INTO public.audit_logs
        (actor_user_id, actor_email, action, target_type, target_id, target_name,
         organization_id, organization_name, metadata, ip_address, user_agent)
       VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, $7::uuid, $8, $9::jsonb, $10, $11)`,
      actorUserId,
      actorEmail,
      action,
      context.targetType ?? null,
      context.targetId ?? null,
      context.targetName ?? null,
      context.organizationId ?? null,
      context.organizationName ?? null,
      context.metadata ? JSON.stringify(context.metadata) : null,
      ipAddress,
      userAgent,
    );
  } catch (err) {
    // No lanzar error: el logging no debe romper la operación principal
    console.error('❌ Error al registrar audit log:', err);
  }
};