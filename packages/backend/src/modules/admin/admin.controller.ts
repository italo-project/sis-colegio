import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { adminRepository } from './admin.repository';
import { adminService } from './admin.service';
import { hashPassword } from '../../utils/password';
import { prisma } from '../../config/prisma';
import { auditLog } from '../../utils/audit-logger';
import { signAccessToken } from '../../utils/jwt';
import {
  createOrganizationSchema,
  deleteOrganizationSchema,
  listAuditLogsQuerySchema,
  listOrganizationsQuerySchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  updateOrganizationSchema,
  updateUserSchema,
} from './admin.schemas';

export const adminController = {
  async globalStats(_req: Request, res: Response) {
    const stats = await adminRepository.getGlobalStats();
    res.json(stats);
  },

  async listOrganizations(req: Request, res: Response) {
    const parsed = listOrganizationsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await adminRepository.listOrganizations(parsed.data);
    res.json(result);
  },

  async getOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const org = await adminRepository.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    const [stats, memberships] = await Promise.all([
      adminRepository.getOrganizationStats(org.id, org.schemaName),
      adminRepository.listMemberships(org.id),
    ]);

    res.json({ organization: org, stats, memberships });
  },

  async createOrganization(req: Request, res: Response) {
    const parsed = createOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    try {
      const result = await adminService.createOrganization(parsed.data);

      await auditLog(req, 'organization.created', {
        targetType: 'organization',
        targetId: result.organization.id,
        targetName: result.organization.name,
        metadata: {
          plan: result.organization.plan,
          subdomain: result.organization.subdomain,
          ceoEmail: result.ceo.email,
        },
      });

      res.status(201).json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear colegio';
      return res.status(400).json({ error: msg });
    }
  },

  async updateOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

        const updated = await adminRepository.updateOrganization(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Organización no encontrada' });

    await auditLog(req, 'organization.updated', {
      targetType: 'organization',
      targetId: id,
      targetName: updated.name,
      metadata: { changes: parsed.data },
    });

    res.json(updated);
  },

  /**
   * Suspende un colegio (is_active = false).
   * Los usuarios no podrán loguearse hasta reactivarlo.
   */
  async suspendOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

        const updated = await adminRepository.updateOrganization(id, { isActive: false });
    if (!updated) return res.status(404).json({ error: 'Organización no encontrada' });

    await auditLog(req, 'organization.suspended', {
      targetType: 'organization',
      targetId: id,
      targetName: updated.name,
    });

    res.json({ ok: true, organization: updated });
  },

  /**
   * Reactiva un colegio.
   */
  async reactivateOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

        const updated = await adminRepository.updateOrganization(id, { isActive: true });
    if (!updated) return res.status(404).json({ error: 'Organización no encontrada' });

    await auditLog(req, 'organization.reactivated', {
      targetType: 'organization',
      targetId: id,
      targetName: updated.name,
    });

    res.json({ ok: true, organization: updated });
  },
    /**
   * DELETE /api/admin/organizations/:id
   * Elimina un colegio definitivamente.
   * Requiere enviar el nombre exacto del colegio en `confirmationName`.
   * Si el colegio tiene datos (estudiantes, facturas) y no se envía `forceDelete: true`, falla.
   */
  async deleteOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = deleteOrganizationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const org = await adminRepository.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    // Verificar confirmación por nombre
    if (parsed.data.confirmationName.trim() !== org.name) {
      return res.status(400).json({
        error: `El nombre de confirmación no coincide. Debes escribir exactamente: "${org.name}"`,
      });
    }

    // Verificar si tiene datos
    const dataCount = await adminRepository.countOrganizationData(org.schemaName);

    if (dataCount.total > 0 && !parsed.data.forceDelete) {
      return res.status(409).json({
        error: 'Este colegio tiene datos. Marca "forzar eliminación" para confirmar.',
        breakdown: dataCount.breakdown,
        total: dataCount.total,
      });
    }

    try {
      const result = await adminRepository.deleteOrganization(
        id,
        org.schemaName,
        req.user!.userId,
      );

            await auditLog(req, 'organization.deleted', {
        targetType: 'organization',
        targetId: id,
        targetName: org.name,
        metadata: {
          reason: parsed.data.reason,
          breakdown: dataCount.breakdown,
        },
      });

      res.json({
        ok: true,
        message: 'Colegio eliminado definitivamente',
        deletedUsers: result.deletedUsers,
        schemaDropped: result.schemaName,
        dataDeleted: dataCount.breakdown,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar colegio';
      console.error('❌ Error eliminando colegio:', msg);
      return res.status(500).json({ error: msg });
    }
  },

  /**
   * GET /api/admin/organizations/:id/export
   * Exporta todos los datos del colegio en formato JSON.
   */
  async exportOrganization(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const org = await adminRepository.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    try {
      const data = await adminRepository.exportOrganizationData(id, org.schemaName);

      const filename = `export_${org.subdomain}_${new Date().toISOString().split('T')[0]}.json`;

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(data, null, 2));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al exportar';
      return res.status(500).json({ error: msg });
    }
  },

  /**
   * GET /api/admin/organizations/:id/data-count
   * Devuelve cuántos datos tiene un colegio (para la UI antes de eliminar).
   */
  async getOrganizationDataCount(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const org = await adminRepository.getOrganizationById(id);
    if (!org) return res.status(404).json({ error: 'Organización no encontrada' });

    const dataCount = await adminRepository.countOrganizationData(org.schemaName);
    res.json(dataCount);
  },

    /**
   * GET /api/admin/users
   */
  async listUsers(req: Request, res: Response) {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await adminRepository.listUsers(parsed.data);
    res.json(result);
  },

  /**
   * GET /api/admin/users/:id
   */
  async getUser(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const result = await adminRepository.getUserById(id);
    if (!result) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(result);
  },

  /**
   * PATCH /api/admin/users/:id
   */
  async updateUser(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    // Verificar email único
    if (parsed.data.email) {
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing && existing.id !== id) {
        return res.status(409).json({ error: 'Ese email ya está en uso por otro usuario' });
      }
    }

        const updated = await adminRepository.updateUser(id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Usuario no encontrado' });

    await auditLog(req, 'user.updated', {
      targetType: 'user',
      targetId: id,
      targetName: updated.fullName,
      metadata: { changes: parsed.data },
    });

    res.json(updated);
  },

  /**
   * POST /api/admin/users/:id/reset-password
   */
  async resetUserPassword(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = resetUserPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const user = await adminRepository.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const passwordHash = await hashPassword(parsed.data.newPassword);
        await adminRepository.updateUserPassword(id, passwordHash);

    await auditLog(req, 'user.password_reset', {
      targetType: 'user',
      targetId: id,
      targetName: user.user.fullName,
    });

    res.json({
      ok: true,
      message: 'Contraseña reseteada',
      newPassword: parsed.data.newPassword,
    });
  },

  /**
   * POST /api/admin/users/:id/toggle-active
   */
  async toggleUserActive(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const user = await adminRepository.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.user.isSuperAdmin) {
      return res.status(400).json({
        error: 'No se puede desactivar a un super-administrador',
      });
    }

        const updated = await adminRepository.updateUser(id, {
      isActive: !user.user.isActive,
    });

    await auditLog(req, updated!.isActive ? 'user.activated' : 'user.deactivated', {
      targetType: 'user',
      targetId: id,
      targetName: updated!.fullName,
    });

    res.json(updated);
  },

  /**
   * DELETE /api/admin/users/:id
   * Solo si no tiene membresías.
   */
  async deleteUser(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const user = await adminRepository.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (user.user.isSuperAdmin) {
      return res.status(400).json({
        error: 'No se puede eliminar a un super-administrador',
      });
    }

        try {
      await adminRepository.deleteUser(id);

      await auditLog(req, 'user.deleted', {
        targetType: 'user',
        targetId: id,
        targetName: user.user.fullName,
      });

      res.json({ ok: true, message: 'Usuario eliminado' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar';
      return res.status(409).json({ error: msg });
    }
  },
    /**
   * POST /api/admin/impersonate/:userId
   * Genera un access token "como" el usuario indicado.
   */
  async impersonateUser(req: Request, res: Response) {
    const targetUserId = getStringParam(req, res, 'userId');
    if (!targetUserId) return;

    const userData = await adminRepository.getUserById(targetUserId);
    if (!userData) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (userData.user.isSuperAdmin) {
      return res.status(400).json({
        error: 'No puedes impersonar a otro super-administrador',
      });
    }

    if (userData.memberships.length === 0) {
      return res.status(400).json({
        error: 'El usuario no pertenece a ningún colegio. No se puede impersonar.',
      });
    }

    // Pedir al frontend qué colegio impersonar si tiene varios
    const organizationIdFromQuery = req.query.organizationId as string | undefined;

    let membership = userData.memberships[0];
    if (organizationIdFromQuery) {
      const found = userData.memberships.find(
        (m) => m.organizationId === organizationIdFromQuery,
      );
      if (!found) {
        return res.status(400).json({
          error: 'El usuario no pertenece a ese colegio',
        });
      }
      membership = found;
    }

    // Obtener el schema del colegio
    const org = await adminRepository.getOrganizationById(membership.organizationId);
    if (!org) return res.status(404).json({ error: 'Colegio no encontrado' });

    // Crear el token "como" ese usuario
    const accessToken = signAccessToken({
      userId: userData.user.id,
  organizationId: membership.organizationId,
  role: membership.role,
  schemaName: org.schemaName,
  isSuperAdmin: false,
  email: userData.user.email,
    });

    // Registrar el log
    await auditLog(req, 'user.impersonated', {
      targetType: 'user',
      targetId: userData.user.id,
      targetName: userData.user.fullName,
      organizationId: membership.organizationId,
      organizationName: org.name,
      metadata: {
        role: membership.role,
        impersonatedBy: req.user!.userId,
      },
      

    });
    

    res.json({
      accessToken,
      user: userData.user,
      tenant: {
        id: membership.organizationId,
        subdomain: org.subdomain,
      },
      role: membership.role,
      impersonatedBy: {
        userId: req.user!.userId,
        email: (req.user as { email?: string }).email,
      },
    });
  },

  /**
   * GET /api/admin/audit-logs
   */
  async listAuditLogs(req: Request, res: Response) {
    const parsed = listAuditLogsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await adminRepository.listAuditLogs(parsed.data);
    res.json(result);
  },
  
};
