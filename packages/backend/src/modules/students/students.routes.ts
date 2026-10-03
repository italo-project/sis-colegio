import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { studentsController } from './students.controller';

export const studentsRouter = Router();

studentsRouter.use(resolveTenant, requireAuth);

studentsRouter.get('/', requireRole('ceo', 'docente'), studentsController.list);
studentsRouter.get('/:id', requireRole('ceo', 'docente'), studentsController.getById);
studentsRouter.get('/:id/courses', requireRole('ceo', 'docente'), studentsController.getCourses);
studentsRouter.get('/:id/parents', requireRole('ceo', 'docente'), studentsController.getParents);
studentsRouter.post('/', requireRole('ceo'), studentsController.create);
studentsRouter.patch('/:id', requireRole('ceo'), studentsController.update);
studentsRouter.delete('/:id', requireRole('ceo'), studentsController.deactivate);
studentsRouter.post('/:id/reactivate', requireRole('ceo'), studentsController.reactivate);
studentsRouter.delete('/:id/hard', requireRole('ceo'), studentsController.hardDelete);
studentsRouter.post('/:id/create-account', requireRole('ceo'), studentsController.createAccount);
studentsRouter.post('/:id/reset-password', requireRole('ceo'), studentsController.resetPassword);