import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { attendanceController } from './attendance.controller';

export const attendanceRouter = Router();

attendanceRouter.use(resolveTenant, requireAuth);

// Sesiones
attendanceRouter.get(
  '/sessions',
  requireRole('ceo', 'docente'),
  attendanceController.listSessions,
);
attendanceRouter.get(
  '/sessions/:id',
  requireRole('ceo', 'docente'),
  attendanceController.getSession,
);
attendanceRouter.post(
  '/sessions',
  requireRole('ceo', 'docente'),
  attendanceController.createSession,
);
attendanceRouter.patch(
  '/sessions/:id',
  requireRole('ceo', 'docente'),
  attendanceController.updateSession,
);
attendanceRouter.delete(
  '/sessions/:id',
  requireRole('ceo', 'docente'),
  attendanceController.deleteSession,
);

// Registros
attendanceRouter.put(
  '/sessions/:id/records/:studentId',
  requireRole('ceo', 'docente'),
  attendanceController.upsertRecord,
);
attendanceRouter.post(
  '/sessions/:id/records/bulk',
  requireRole('ceo', 'docente'),
  attendanceController.bulkRecords,
);
attendanceRouter.delete(
  '/sessions/:id/records/:studentId',
  requireRole('ceo', 'docente'),
  attendanceController.removeRecord,
);