import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { coursesRepository } from '../courses/courses.repository';
import { enrollmentsRepository } from './enrollments.repository';
import {
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
};