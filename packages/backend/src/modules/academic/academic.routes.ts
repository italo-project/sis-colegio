import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { academicController } from './academic.controller';

export const academicRouter = Router();

academicRouter.use(resolveTenant, requireAuth);

// Años escolares
academicRouter.get('/years', requireRole('ceo', 'docente'), academicController.listYears);
academicRouter.get('/years/current', requireRole('ceo', 'docente', 'estudiante', 'padre'), academicController.getCurrentYear);
academicRouter.post('/years', requireRole('ceo'), academicController.createYear);
academicRouter.patch('/years/:id', requireRole('ceo'), academicController.updateYear);

// Grados (catálogo)
academicRouter.get('/grade-levels', requireRole('ceo', 'docente'), academicController.listGradeLevels);

// Secciones
academicRouter.get('/sections', requireRole('ceo', 'docente'), academicController.listSections);
academicRouter.get('/sections/:id', requireRole('ceo', 'docente'), academicController.getSectionById);
academicRouter.post('/sections', requireRole('ceo'), academicController.createSection);
academicRouter.patch('/sections/:id', requireRole('ceo'), academicController.updateSection);
academicRouter.delete('/sections/:id', requireRole('ceo'), academicController.deactivateSection);
academicRouter.post('/sections/:id/reactivate', requireRole('ceo'), academicController.reactivateSection);
academicRouter.delete('/sections/:id/hard', requireRole('ceo'), academicController.hardDeleteSection);
academicRouter.patch('/sections/:id/tutor', requireRole('ceo'), academicController.assignTutor);