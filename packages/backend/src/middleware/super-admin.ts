import { Request, Response, NextFunction } from 'express';

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (!req.user.isSuperAdmin) {
    return res.status(403).json({ error: 'Requiere permisos de super-administrador' });
  }
  next();
};