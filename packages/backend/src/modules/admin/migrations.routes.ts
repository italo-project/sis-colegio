import { Router } from 'express';
import { migrateAllTenants, migrateTenantSchema } from '../../db/tenant-migrations-service';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const adminMigrationsRouter = Router();

/**
 * Aplica migraciones pendientes al colegio del contexto actual.
 * Requiere CEO del colegio.
 */
adminMigrationsRouter.post(
  '/migrate-tenant',
  resolveTenant,
  requireAuth,
  requireRole('ceo'),
  async (req, res) => {
    const applied = await migrateTenantSchema(req.tenant!.schemaName);
    res.json({
      tenant: req.tenant!.subdomain,
      schema: req.tenant!.schemaName,
      applied,
      message: applied.length === 0 ? 'Ya estaba al día' : `Migraciones aplicadas: ${applied.length}`,
    });
  },
);

/**
 * Aplica migraciones pendientes a TODOS los colegios activos.
 * ⚠️ En producción, este endpoint debe estar restringido al rol admin global
 * (dueño del sistema), no al CEO de un colegio.
 * Por ahora, en desarrollo, lo dejamos abierto.
 */
adminMigrationsRouter.post('/migrate-all-tenants', async (_req, res) => {
  const results = await migrateAllTenants();
  res.json({ results });
});