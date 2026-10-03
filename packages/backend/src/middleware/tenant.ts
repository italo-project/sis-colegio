import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export type TenantContext = {
  id: string;
  subdomain: string;
  schemaName: string;
  name: string;
};

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      user?: {
        userId: string;
        organizationId: string;
        role: string;
        isSuperAdmin?: boolean;
        email?: string; 
      };
    }
  }
}

export const resolveTenant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const host = req.hostname; // ej: "sanmartin.localhost"
    const parts = host.split('.');
    let subdomain = parts.length > 1 ? parts[0] : undefined;

    // Fallback para desarrollo con herramientas como Postman/curl
    if (!subdomain || subdomain === 'localhost' || subdomain === 'www') {
      subdomain = req.header('X-Tenant-Subdomain') || undefined;
    }

    if (!subdomain) {
      return res.status(400).json({ error: 'No se pudo resolver el colegio (subdominio ausente)' });
    }

    const org = await prisma.organization.findUnique({ where: { subdomain } });
    if (!org || !org.isActive) {
      return res.status(404).json({ error: `Colegio "${subdomain}" no encontrado o inactivo` });
    }

    req.tenant = {
      id: org.id,
      subdomain: org.subdomain,
      schemaName: org.schemaName,
      name: org.name,
    };
    next();
  } catch (err) {
    next(err);
  }
};