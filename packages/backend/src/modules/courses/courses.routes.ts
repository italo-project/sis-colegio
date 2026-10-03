import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { coursesController } from './courses.controller';

export const coursesRouter = Router();

coursesRouter.use(resolveTenant, requireAuth);

coursesRouter.get('/', requireRole('ceo', 'docente'), coursesController.list);
coursesRouter.get('/:id', requireRole('ceo', 'docente'), coursesController.getById);
coursesRouter.get('/:id/students', requireRole('ceo', 'docente'), coursesController.getStudents);
coursesRouter.post('/', requireRole('ceo'), coursesController.create);
coursesRouter.patch('/:id', requireRole('ceo'), coursesController.update);
coursesRouter.delete('/:id', requireRole('ceo'), coursesController.deactivate);
coursesRouter.post('/:id/reactivate', requireRole('ceo'), coursesController.reactivate);
coursesRouter.delete('/:id/hard', requireRole('ceo'), coursesController.hardDelete);