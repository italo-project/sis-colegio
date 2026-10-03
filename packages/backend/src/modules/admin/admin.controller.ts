import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { adminRepository } from './admin.repository';
import { adminService } from './admin.service';
import {
  createOrganizationSchema,
  listOrganizationsQuerySchema,
  updateOrganizationSchema,
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
    res.json({ ok: true, organization: updated });
  },
};