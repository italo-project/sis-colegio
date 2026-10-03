import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { teachersRepository } from '../teachers/teachers.repository';
import { coursesRepository } from './courses.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import {
  createCourseSchema,
  listCoursesQuerySchema,
  updateCourseSchema,
} from './courses.schemas';

export const coursesController = {
    async create(req: Request, res: Response) {
    const parsed = createCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;

    // Validar unicidad (asignatura + sección + año)
    let existing;
    try {
      existing = await coursesRepository.findByUniqueKey(
        req.tenant!.schemaName,
        input.academicYearId,
        input.sectionId,
        input.subjectId,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error consultando cursos';
      return res.status(500).json({ error: `Error al consultar cursos: ${msg}` });
    }

    if (existing) {
      return res.status(409).json({
        error: 'Ya existe un curso con esa asignatura, sección y año',
      });
    }

    // Validar que el docente existe y está activo
    const teacher = await teachersRepository.findById(req.tenant!.schemaName, input.teacherId);
    if (!teacher || !teacher.isActive) {
      return res.status(404).json({ error: 'Docente no encontrado o inactivo' });
    }

    try {
      const course = await coursesRepository.create(req.tenant!.schemaName, input);
      const detailed = await coursesRepository.findById(req.tenant!.schemaName, course.id);
      res.status(201).json(detailed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear curso';
      return res.status(400).json({ error: msg });
    }
  },

  async list(req: Request, res: Response) {
    const parsed = listCoursesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await coursesRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(result);
  },

    async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const course = await coursesRepository.findDetailedById(req.tenant!.schemaName, id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const related = await coursesRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...course,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateCourseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    // Si cambia el docente, validar que exista y esté activo
    if (parsed.data.teacherId) {
      const teacher = await teachersRepository.findById(
        req.tenant!.schemaName,
        parsed.data.teacherId,
      );
      if (!teacher || !teacher.isActive) {
        return res.status(404).json({ error: 'Docente no encontrado o inactivo' });
      }
    }

    const course = await coursesRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const course = await coursesRepository.deactivate(req.tenant!.schemaName, id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json(course);
  },
    async getStudents(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const course = await coursesRepository.findById(req.tenant!.schemaName, id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const enrollments = await enrollmentsRepository.listByCourse(
      req.tenant!.schemaName,
      id,
    );
    res.json({ items: enrollments, total: enrollments.length });
  },
    async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const course = await coursesRepository.findById(req.tenant!.schemaName, id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    if (course.isActive) {
      return res.status(409).json({ error: 'El curso ya está activo' });
    }

    const updated = await coursesRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
  },

  async hardDelete(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const course = await coursesRepository.findById(req.tenant!.schemaName, id);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    if (course.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar un curso activo. Desactívalo primero.',
      });
    }

    const related = await coursesRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el curso tiene datos asociados (${related.total}).`,
        breakdown: related.breakdown,
      });
    }

    const deleted = await coursesRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Curso eliminado definitivamente', course: deleted });
  },
};