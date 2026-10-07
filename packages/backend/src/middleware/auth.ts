import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de acceso ausente' });
  }
  try {
    const token = header.slice('Bearer '.length);
    const payload = verifyAccessToken(token);

    if (req.tenant && payload.organizationId !== req.tenant.id) {
      return res.status(403).json({ error: 'El token no pertenece a este colegio' });
    }

    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin,
      email: payload.email,
      mustChangePassword: payload.mustChangePassword,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};