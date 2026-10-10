import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { enrollmentsController } from './enrollments.controller';

export const enrollmentsRouter = Router();

enrollmentsRouter.use(resolveTenant, requireAuth);

enrollmentsRouter.get('/', requireRole('ceo', 'docente'), enrollmentsController.list);
enrollmentsRouter.post('/auto', requireRole('ceo'), enrollmentsController.autoEnroll);
enrollmentsRouter.get('/available-students', requireRole('ceo'), enrollmentsController.availableStudentsForSection);
enrollmentsRouter.get('/:id', requireRole('ceo', 'docente'), enrollmentsController.getById);
enrollmentsRouter.post('/', requireRole('ceo'), enrollmentsController.create);
enrollmentsRouter.patch('/:id', requireRole('ceo'), enrollmentsController.update);
enrollmentsRouter.delete('/:id', requireRole('ceo'), enrollmentsController.remove);