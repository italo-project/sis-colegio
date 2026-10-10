import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { gradesController } from './grades.controller';
import { gradeEntriesController } from './grades-entries.controller';

export const gradesRouter = Router();

gradesRouter.use(resolveTenant, requireAuth);

// ── Categorías anidadas bajo cursos ─────────────────────────
gradesRouter.get(
  '/courses/:courseId/grade-categories',
  requireRole('ceo', 'docente'),
  gradesController.listCategories,
);
gradesRouter.post(
  '/courses/:courseId/grade-categories',
  requireRole('ceo', 'docente'),
  gradesController.createCategory,
);
gradesRouter.get(
  '/courses/:courseId/evaluations',
  requireRole('ceo', 'docente'),
  gradesController.listEvaluationsByCourse,
);

// ── Categorías por su propio ID ─────────────────────────────
gradesRouter.patch(
  '/grade-categories/:id',
  requireRole('ceo', 'docente'),
  gradesController.updateCategory,
);
gradesRouter.delete(
  '/grade-categories/:id',
  requireRole('ceo', 'docente'),
  gradesController.deactivateCategory,
);

// ── Evaluaciones anidadas bajo categorías ───────────────────
gradesRouter.get(
  '/grade-categories/:categoryId/evaluations',
  requireRole('ceo', 'docente'),
  gradesController.listEvaluationsByCategory,
);
gradesRouter.post(
  '/grade-categories/:categoryId/evaluations',
  requireRole('ceo', 'docente'),
  gradesController.createEvaluation,
);

// ── Evaluaciones por su propio ID ───────────────────────────
gradesRouter.patch(
  '/evaluations/:id',
  requireRole('ceo', 'docente'),
  gradesController.updateEvaluation,
);
gradesRouter.delete(
  '/evaluations/:id',
  requireRole('ceo', 'docente'),
  gradesController.deactivateEvaluation,
);

// ── Notas (grade entries) ───────────────────────────────────
gradesRouter.get(
  '/evaluations/:evaluationId/grades',
  requireRole('ceo', 'docente'),
  gradeEntriesController.listByEvaluation,
);
gradesRouter.post(
  '/evaluations/:evaluationId/grades/bulk',
  requireRole('ceo', 'docente'),
  gradeEntriesController.bulk,
);
gradesRouter.put(
  '/evaluations/:evaluationId/grades/:studentId',
  requireRole('ceo', 'docente'),
  gradeEntriesController.upsert,
);
gradesRouter.delete(
  '/evaluations/:evaluationId/grades/:studentId',
  requireRole('ceo', 'docente'),
  gradeEntriesController.remove,
);

gradesRouter.get(
  '/courses/:courseId/students/:studentId/grades',
  requireRole('ceo', 'docente'),
  gradeEntriesController.listByStudentAndCourse,
);

// ── Reporte completo de un estudiante (para CEO) ────────────
gradesRouter.get(
  '/students/:studentId/report',
  requireRole('ceo', 'docente'),
  gradesController.getStudentReport,
);