import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { teachersController } from './teachers.controller';

export const teachersRouter = Router();

teachersRouter.use(resolveTenant, requireAuth);

teachersRouter.get('/', requireRole('ceo', 'docente'), teachersController.list);
teachersRouter.get('/:id', requireRole('ceo', 'docente'), teachersController.getById);
teachersRouter.post('/', requireRole('ceo'), teachersController.create);
teachersRouter.patch('/:id', requireRole('ceo'), teachersController.update);
teachersRouter.delete('/:id', requireRole('ceo'), teachersController.deactivate);
teachersRouter.post('/:id/reactivate', requireRole('ceo'), teachersController.reactivate);
teachersRouter.delete('/:id/hard', requireRole('ceo'), teachersController.hardDelete);