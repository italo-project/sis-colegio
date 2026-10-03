import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { parentsController } from './parents.controller';

export const parentsRouter = Router();

parentsRouter.use(resolveTenant, requireAuth);

parentsRouter.get('/', requireRole('ceo', 'docente'), parentsController.list);
parentsRouter.get('/:id', requireRole('ceo', 'docente'), parentsController.getById);
parentsRouter.get('/:id/students', requireRole('ceo', 'docente'), parentsController.getStudents);
parentsRouter.post('/', requireRole('ceo'), parentsController.create);
parentsRouter.patch('/:id', requireRole('ceo'), parentsController.update);
parentsRouter.delete('/:id', requireRole('ceo'), parentsController.deactivate);
parentsRouter.post('/:id/reactivate', requireRole('ceo'), parentsController.reactivate);
parentsRouter.delete('/:id/hard', requireRole('ceo'), parentsController.hardDelete);
parentsRouter.post('/:id/reset-password', requireRole('ceo'), parentsController.resetPassword);