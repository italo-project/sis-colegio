import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { studentParentsController } from './student-parents.controller';

export const studentParentsRouter = Router();

studentParentsRouter.use(resolveTenant, requireAuth);

studentParentsRouter.get('/', requireRole('ceo', 'docente'), studentParentsController.list);
studentParentsRouter.get('/:id', requireRole('ceo', 'docente'), studentParentsController.getById);
studentParentsRouter.post('/', requireRole('ceo'), studentParentsController.create);
studentParentsRouter.patch('/:id', requireRole('ceo'), studentParentsController.update);
studentParentsRouter.delete('/:id', requireRole('ceo'), studentParentsController.remove);