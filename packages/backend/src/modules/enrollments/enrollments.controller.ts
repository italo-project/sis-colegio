import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { coursesRepository } from '../courses/courses.repository';
import { enrollmentsRepository } from './enrollments.repository';
import { prisma } from '../../config/prisma';
import {
  autoEnrollSectionSchema,
  createEnrollmentSchema,
  listEnrollmentsQuerySchema,
  updateEnrollmentSchema,
} from './enrollments.schemas';

export const enrollmentsController = {
  async create(req: Request, res: Response) {
    const parsed = createEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const schema = req.tenant!.schemaName;

    // Validar que el estudiante existe y está activo
    const student = await studentsRepository.findById(schema, input.studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
    }

    // Validar que el curso existe y está activo
    const course = await coursesRepository.findById(schema, input.courseId);
    if (!course || !course.isActive) {
      return res.status(404).json({ error: 'Curso no encontrado o inactivo' });
    }

    // Validar que no exista matrícula previa
    const existing = await enrollmentsRepository.findByCourseAndStudent(
      schema,
      input.courseId,
      input.studentId,
    );
    if (existing) {
      return res.status(409).json({
        error: 'El estudiante ya está matriculado en este curso',
      });
    }

    const enrollment = await enrollmentsRepository.create(schema, input);
    const detailed = await enrollmentsRepository.findDetailedById(schema, enrollment.id);
    res.status(201).json(detailed);
  },

  async list(req: Request, res: Response) {
    const parsed = listEnrollmentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const enrollments = await enrollmentsRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(enrollments);
  },

  async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const enrollment = await enrollmentsRepository.findDetailedById(
      req.tenant!.schemaName,
      id,
    );
    if (!enrollment) return res.status(404).json({ error: 'Matrícula no encontrada' });
    res.json(enrollment);
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateEnrollmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const enrollment = await enrollmentsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!enrollment) return res.status(404).json({ error: 'Matrícula no encontrada' });
    res.json(enrollment);
  },

  async remove(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const enrollment = await enrollmentsRepository.delete(req.tenant!.schemaName, id);
    if (!enrollment) return res.status(404).json({ error: 'Matrícula no encontrada' });
    res.json({ message: 'Matrícula eliminada', enrollment });
  },

    /**
   * POST /api/enrollments/auto
   * Matricula a varios estudiantes en TODOS los cursos de una sección.
   */
  async autoEnroll(req: Request, res: Response) {
    const parsed = autoEnrollSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const { sectionId, studentIds } = parsed.data;
    const schema = req.tenant!.schemaName;

    // 1) Verificar que la sección existe y está activa
    const sectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schema}".sections WHERE id = $1::uuid AND is_active = true LIMIT 1`,
      sectionId,
    );
    if (!sectionRows[0]) {
      return res.status(404).json({ error: 'Sección no encontrada o inactiva' });
    }

    // 2) Verificar que la sección tiene cursos activos
    const courseCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM "${schema}".courses
        WHERE section_id = $1::uuid AND is_active = true`,
      sectionId,
    );
    if (Number(courseCount[0].count) === 0) {
      return res.status(400).json({
        error: 'La sección no tiene cursos activos. Genera los cursos primero.',
      });
    }

    // 3) Validar que los estudiantes existen y están activos
    const validStudents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schema}".students
        WHERE id = ANY($1::uuid[]) AND is_active = true`,
      studentIds,
    );
    const validIds = new Set(validStudents.map((s) => s.id));
    const invalidStudents = studentIds.filter((id) => !validIds.has(id));
    if (invalidStudents.length > 0) {
      return res.status(400).json({
        error: 'Algunos estudiantes no existen o están inactivos',
        invalidStudents,
      });
    }

    // 4) Matricular cada uno
    const results: Array<{
      studentId: string;
      created: number;
      skipped: number;
      errors: number;
    }> = [];

    for (const studentId of studentIds) {
      const r = await enrollmentsRepository.autoEnrollStudentInSection(
        schema,
        studentId,
        sectionId,
      );
      results.push({ studentId, ...r });
    }

    const totalCreated = results.reduce((s, r) => s + r.created, 0);
    const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
    const totalErrors = results.reduce((s, r) => s + r.errors, 0);

    return res.status(201).json({
      studentsProcessed: studentIds.length,
      enrollmentsCreated: totalCreated,
      enrollmentsSkipped: totalSkipped,
      enrollmentsErrors: totalErrors,
      details: results,
    });
  },

  /**
   * GET /api/enrollments/available-students?sectionId=...
   * Devuelve los estudiantes activos que NO están matriculados aún en la sección.
   */
  async availableStudentsForSection(req: Request, res: Response) {
    const sectionId = typeof req.query.sectionId === 'string' ? req.query.sectionId : null;
    if (!sectionId) {
      return res.status(400).json({ error: 'sectionId es requerido' });
    }
    const schema = req.tenant!.schemaName;

    const enrolledIds = await enrollmentsRepository.findEnrolledStudentIdsInSection(
      schema,
      sectionId,
    );

    // Traer todos los estudiantes activos excepto los ya matriculados
    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; full_name: string; dni: string; email: string | null }>
    >(
      `SELECT id, full_name, dni, email
         FROM "${schema}".students
        WHERE is_active = true
          AND id <> ALL($1::uuid[])
        ORDER BY full_name ASC`,
      enrolledIds.length > 0 ? enrolledIds : ['00000000-0000-0000-0000-000000000000'],
    );

    return res.json({
      items: rows.map((r) => ({
        id: r.id,
        fullName: r.full_name,
        dni: r.dni,
        email: r.email,
      })),
      total: rows.length,
    });
  },


};