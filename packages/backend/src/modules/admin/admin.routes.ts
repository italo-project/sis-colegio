import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { requireSuperAdmin } from '../../middleware/super-admin';
import { adminController } from './admin.controller';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireSuperAdmin);

adminRouter.get('/stats', adminController.globalStats);

// Organizaciones
adminRouter.get('/organizations', adminController.listOrganizations);
adminRouter.get('/organizations/:id', adminController.getOrganization);
adminRouter.get('/organizations/:id/data-count', adminController.getOrganizationDataCount);
adminRouter.get('/organizations/:id/export', adminController.exportOrganization);
adminRouter.post('/organizations', adminController.createOrganization);
adminRouter.patch('/organizations/:id', adminController.updateOrganization);
adminRouter.post('/organizations/:id/suspend', adminController.suspendOrganization);
adminRouter.post('/organizations/:id/reactivate', adminController.reactivateOrganization);
adminRouter.delete('/organizations/:id', adminController.deleteOrganization);

// Usuarios
adminRouter.get('/users', adminController.listUsers);
adminRouter.get('/users/:id', adminController.getUser);
adminRouter.patch('/users/:id', adminController.updateUser);
adminRouter.post('/users/:id/reset-password', adminController.resetUserPassword);
adminRouter.post('/users/:id/toggle-active', adminController.toggleUserActive);
adminRouter.delete('/users/:id', adminController.deleteUser);

// Impersonación
adminRouter.post('/impersonate/:userId', adminController.impersonateUser);

// Audit logs
adminRouter.get('/audit-logs', adminController.listAuditLogs);