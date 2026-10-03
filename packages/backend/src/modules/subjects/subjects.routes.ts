import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { subjectsController } from './subjects.controller';

export const subjectsRouter = Router();

subjectsRouter.use(resolveTenant, requireAuth);

subjectsRouter.get('/', requireRole('ceo', 'docente'), subjectsController.list);
subjectsRouter.get('/:id', requireRole('ceo', 'docente'), subjectsController.getById);
subjectsRouter.post('/', requireRole('ceo'), subjectsController.create);
subjectsRouter.patch('/:id', requireRole('ceo'), subjectsController.update);
subjectsRouter.delete('/:id', requireRole('ceo'), subjectsController.deactivate);
subjectsRouter.post('/:id/reactivate', requireRole('ceo'), subjectsController.reactivate);
subjectsRouter.delete('/:id/hard', requireRole('ceo'), subjectsController.hardDelete);