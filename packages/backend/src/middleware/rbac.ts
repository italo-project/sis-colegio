import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'ceo' | 'docente' | 'estudiante' | 'padre';

export const requireRole = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    if (!roles.includes(req.user.role as Role)) {
      return res.status(403).json({
        error: `Requiere uno de los roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};