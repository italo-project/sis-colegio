import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { academicController } from './academic.controller';
import { closeYearController } from '../academic-close-year/close-year.controller';

export const academicRouter = Router();

academicRouter.use(resolveTenant, requireAuth);

// ─── Años escolares ─────────────────────────────────────────────
academicRouter.get('/years', requireRole('ceo', 'docente'), academicController.listYears);
academicRouter.get(
  '/years/current',
  requireRole('ceo', 'docente', 'estudiante', 'padre'),
  academicController.getCurrentYear,
);
academicRouter.post('/years', requireRole('ceo'), academicController.createYear);
academicRouter.patch('/years/:id', requireRole('ceo'), academicController.updateYear);

// ─── Grados (catálogo, solo lectura) ────────────────────────────
academicRouter.get(
  '/grade-levels',
  requireRole('ceo', 'docente'),
  academicController.listGradeLevels,
);

// ─── Secciones ──────────────────────────────────────────────────
// Listado general
academicRouter.get('/sections', requireRole('ceo', 'docente'), academicController.listSections);

// Detalle y datos relacionados (van ANTES de /:id genérico)
academicRouter.get(
  '/sections/:id/detail',
  requireRole('ceo', 'docente'),
  academicController.getSectionDetail,
);
academicRouter.get(
  '/sections/:id/students',
  requireRole('ceo', 'docente'),
  academicController.listSectionStudents,
);
academicRouter.get(
  '/sections/:id/courses',
  requireRole('ceo', 'docente'),
  academicController.listSectionCourses,
);

// Asignación de tutor
academicRouter.patch(
  '/sections/:id/tutor',
  requireRole('ceo'),
  academicController.assignTutor,
);

// Detalle básico
academicRouter.get(
  '/sections/:id',
  requireRole('ceo', 'docente'),
  academicController.getSectionById,
);

// Crear, editar, desactivar
academicRouter.post('/sections', requireRole('ceo'), academicController.createSection);
academicRouter.post('/sections/bulk', requireRole('ceo'), academicController.bulkCreateSections);
academicRouter.patch('/sections/:id', requireRole('ceo'), academicController.updateSection);
academicRouter.delete('/sections/:id', requireRole('ceo'), academicController.deactivateSection);
academicRouter.post(
  '/sections/:id/reactivate',
  requireRole('ceo'),
  academicController.reactivateSection,
);
academicRouter.delete(
  '/sections/:id/hard',
  requireRole('ceo'),
  academicController.hardDeleteSection,
);

// ─── Fase E: Cierre de año escolar ──────────────────────────────
// IMPORTANTE: van al final para no chocar con /sections/:id
academicRouter.get(
  '/close-year/candidates',
  requireRole('ceo'),
  closeYearController.listCandidates,
);

academicRouter.post(
  '/close-year',
  requireRole('ceo'),
  closeYearController.closeYear,
);

academicRouter.post(
  '/preload-next-year',
  requireRole('ceo'),
  closeYearController.preloadNextYear,
);

academicRouter.post(
  '/assign-next-sections',
  requireRole('ceo'),
  closeYearController.assignNextSections,
);

academicRouter.get(
  '/students/:id/year-history',
  requireRole('ceo', 'estudiante', 'padre'),
  closeYearController.getStudentHistory,
);