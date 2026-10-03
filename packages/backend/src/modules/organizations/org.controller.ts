import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';

/**
 * Lista pública de colegios activos.
 * Útil para landings, selectores de institución o pruebas.
 */
export const listOrganizations = async (_req: Request, res: Response) => {
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true, name: true, subdomain: true, plan: true },
    orderBy: { name: 'asc' },
  });
  res.json(orgs);
};

const subdomainParam = z.object({
  subdomain: z.string().regex(/^[a-z][a-z0-9-]{2,30}$/),
});

/**
 * Devuelve los datos públicos de un colegio por subdominio.
 * No expone información sensible (nada de schemaName, plan interno, etc.).
 */
export const getOrganizationBySubdomain = async (req: Request, res: Response) => {
  const parsed = subdomainParam.safeParse(req.params);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Subdominio inválido' });
  }

  const org = await prisma.organization.findUnique({
    where: { subdomain: parsed.data.subdomain },
    select: { id: true, name: true, subdomain: true, isActive: true },
  });

  if (!org || !org.isActive) {
    return res.status(404).json({ error: 'Colegio no encontrado' });
  }

  res.json(org);
};