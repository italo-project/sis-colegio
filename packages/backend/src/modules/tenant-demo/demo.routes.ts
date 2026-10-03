import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { getTenantInfo, addTenantInfo } from '../../utils/tenant-schema';

export const demoRouter = Router();

demoRouter.use(resolveTenant, requireAuth);

// Cualquier rol autenticado puede ver la info de su colegio
demoRouter.get('/info', async (req, res) => {
  const rows = await getTenantInfo(req.tenant!.schemaName);
  res.json({
    tenant: { id: req.tenant!.id, name: req.tenant!.name, schema: req.tenant!.schemaName },
    user: req.user,
    data: rows,
  });
});

// Solo el CEO puede insertar mensajes en su propio esquema
demoRouter.post('/info', requireRole('ceo'), async (req, res) => {
  const message = String(req.body?.message ?? '').trim();
  if (message.length < 3) return res.status(400).json({ error: 'Mensaje muy corto' });
  await addTenantInfo(req.tenant!.schemaName, message);
  res.status(201).json({ ok: true });
});