import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/super-admin';
import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperAdmin);

adminRouter.get('/stats', adminController.globalStats);
adminRouter.get('/organizations', adminController.listOrganizations);
adminRouter.get('/organizations/:id', adminController.getOrganization);
adminRouter.post('/organizations', adminController.createOrganization);
adminRouter.patch('/organizations/:id', adminController.updateOrganization);
adminRouter.post('/organizations/:id/suspend', adminController.suspendOrganization);
adminRouter.post('/organizations/:id/reactivate', adminController.reactivateOrganization);