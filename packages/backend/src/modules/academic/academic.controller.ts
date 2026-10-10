import { Request, Response } from 'express';
import { academicYearsRepository } from './academic-years.repository';
import { gradeLevelsRepository } from './grade-levels.repository';
import { sectionsRepository } from './sections.repository';
import { prisma } from '../../config/prisma';
import {
  assignTutorSchema,
  bulkCreateSectionsSchema,
  createAcademicYearSchema,
  createSectionSchema,
  listSectionsQuerySchema,
  updateAcademicYearSchema,
  updateSectionSchema,
} from './academic.schemas';
import { getStringParam } from '../../utils/params';

export const academicController = {
  // ── Años escolares ─────────────────────────────────────────
  async listYears(req: Request, res: Response) {
    const years = await academicYearsRepository.list(req.tenant!.schemaName);
    res.json(years);
  },

  async getCurrentYear(req: Request, res: Response) {
    const year = await academicYearsRepository.findCurrent(req.tenant!.schemaName);
    if (!year) return res.status(404).json({ error: 'No hay año escolar activo' });
    res.json(year);
  },

  async createYear(req: Request, res: Response) {
    const parsed = createAcademicYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const year = await academicYearsRepository.create(req.tenant!.schemaName, parsed.data);
    res.status(201).json(year);
  },

  async updateYear(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateAcademicYearSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const year = await academicYearsRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!year) return res.status(404).json({ error: 'Año escolar no encontrado' });
    res.json(year);
  },

  // ── Grados (catálogo, solo lectura) ─────────────────────────
  async listGradeLevels(req: Request, res: Response) {
    const levels = await gradeLevelsRepository.list(req.tenant!.schemaName);
    res.json(levels);
  },

  // ── Secciones ───────────────────────────────────────────────
  async listSections(req: Request, res: Response) {
    const parsed = listSectionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const sections = await sectionsRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(sections);
  },

  async createSection(req: Request, res: Response) {
    const parsed = createSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const section = await sectionsRepository.create(req.tenant!.schemaName, parsed.data);
    res.status(201).json(section);
  },

    /**
   * POST /api/academic/sections/bulk
   * Crea varias secciones de golpe para un mismo año + grado.
   */
  async bulkCreateSections(req: Request, res: Response) {
    const parsed = bulkCreateSectionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const result = await sectionsRepository.bulkCreate(
      req.tenant!.schemaName,
      parsed.data,
    );

    if ('error' in result) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  },

  async updateSection(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const section = await sectionsRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(section);
  },

  async deactivateSection(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.deactivate(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(section);
  },


  async getSectionById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    const related = await sectionsRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...section,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

  async reactivateSection(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    if (section.isActive) {
      return res.status(409).json({ error: 'La sección ya está activa' });
    }

    const updated = await sectionsRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
  },

  async hardDeleteSection(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    if (section.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar una sección activa. Desactívala primero.',
      });
    }

    const related = await sectionsRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: la sección tiene datos asociados (${related.total}).`,
        breakdown: related.breakdown,
      });
    }

    const deleted = await sectionsRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Sección eliminada definitivamente', section: deleted });
  },


    /**
   * PATCH /api/academic/sections/:id/tutor
   * Asigna o quita el tutor de una sección.
   */
    async assignTutor(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = assignTutorSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    // Validar que el usuario tutor existe y es docente en este colegio
    if (parsed.data.tutorUserId) {
      const membership = await prisma.organizationUser.findFirst({
        where: {
          userId: parsed.data.tutorUserId,
          organizationId: req.tenant!.id,
          role: 'docente',
          isActive: true,
        },
      });
      if (!membership) {
        return res.status(400).json({
          error: 'El usuario indicado no es docente activo en este colegio',
        });
      }
    }

    const updated = await sectionsRepository.assignTutor(
      req.tenant!.schemaName,
      id,
      parsed.data.tutorUserId,
    );
    res.json(updated);
  },
    /**
   * GET /api/academic/sections/:id/detail
   */
  async getSectionDetail(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const detail = await sectionsRepository.getDetail(req.tenant!.schemaName, id);
    if (!detail) return res.status(404).json({ error: 'Sección no encontrada' });
    res.json(detail);
  },

  /**
   * GET /api/academic/sections/:id/students
   */
  async listSectionStudents(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    const students = await sectionsRepository.listStudents(req.tenant!.schemaName, id);
    res.json({ items: students, total: students.length });
  },

  /**
   * GET /api/academic/sections/:id/courses
   */
  async listSectionCourses(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const section = await sectionsRepository.findById(req.tenant!.schemaName, id);
    if (!section) return res.status(404).json({ error: 'Sección no encontrada' });

    const courses = await sectionsRepository.listCourses(req.tenant!.schemaName, id);
    res.json({ items: courses, total: courses.length });
  },
};