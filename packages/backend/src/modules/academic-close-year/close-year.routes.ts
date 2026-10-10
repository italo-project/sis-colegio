import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { closeYearController } from './close-year.controller';

export const closeYearRouter = Router();

closeYearRouter.use(requireAuth);

// Solo el CEO puede cerrar año y precargar
closeYearRouter.get(
  '/close-year/candidates',
  requireRole('ceo'),
  closeYearController.listCandidates,
);

closeYearRouter.post(
  '/close-year',
  requireRole('ceo'),
  closeYearController.closeYear,
);

closeYearRouter.post(
  '/preload-next-year',
  requireRole('ceo'),
  closeYearController.preloadNextYear,
);

closeYearRouter.post(
  '/assign-next-sections',
  requireRole('ceo'),
  closeYearController.assignNextSections,
);

// El historial lo puede ver el CEO (y en el futuro, el propio estudiante)
closeYearRouter.get(
  '/students/:id/year-history',
  requireRole('ceo', 'estudiante', 'padre'),
  closeYearController.getStudentHistory,
);