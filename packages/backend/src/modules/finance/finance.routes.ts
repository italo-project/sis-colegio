import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { financeController } from './finance.controller';
import { reportsController } from './reports.controller';

export const financeRouter = Router();

financeRouter.use(resolveTenant, requireAuth);

// Conceptos
financeRouter.get('/fee-concepts', requireRole('ceo'), financeController.listConcepts);
financeRouter.post('/fee-concepts', requireRole('ceo'), financeController.createConcept);
financeRouter.patch('/fee-concepts/:id', requireRole('ceo'), financeController.updateConcept);
financeRouter.delete('/fee-concepts/:id', requireRole('ceo'), financeController.deactivateConcept);
financeRouter.put('/fee-concepts/:id/amounts', requireRole('ceo'), financeController.upsertAmount);
financeRouter.get('/fee-concepts/:id/amounts', requireRole('ceo'), financeController.listAmounts);

// Facturas
financeRouter.get('/invoices', requireRole('ceo'), financeController.listInvoices);
financeRouter.get('/invoices/:id', requireRole('ceo'), financeController.getInvoice);
financeRouter.post('/invoices', requireRole('ceo'), financeController.createInvoice);
financeRouter.post('/invoices/bulk', requireRole('ceo'), financeController.bulkInvoices);
financeRouter.patch('/invoices/:id', requireRole('ceo'), financeController.updateInvoice);
financeRouter.delete('/invoices/:id', requireRole('ceo'), financeController.cancelInvoice);

// Pagos
financeRouter.post('/invoices/:id/pay', requireRole('padre'), financeController.simulatePayment);
financeRouter.post(
  '/invoices/:id/pay/mercadopago',
  requireRole('padre'),
  financeController.payWithMercadoPago,
);

// Reportes
financeRouter.get('/reports/summary', requireRole('ceo'), reportsController.summary);
financeRouter.get('/reports/by-period', requireRole('ceo'), reportsController.byPeriod);
financeRouter.get('/reports/by-concept', requireRole('ceo'), reportsController.byConcept);
financeRouter.get('/reports/by-grade', requireRole('ceo'), reportsController.byGrade);
financeRouter.get('/reports/overdue', requireRole('ceo'), reportsController.overdue);
financeRouter.get('/reports/student/:studentId', requireRole('ceo'), reportsController.studentStatement);
financeRouter.get('/reports/export/invoices', requireRole('ceo'), reportsController.exportInvoicesCsv);