import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from './students.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import {
  createStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
} from './students.schemas';

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).default('Cambiar123!'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const studentsController = {
  async create(req: Request, res: Response) {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const existing = await studentsRepository.findByDni(req.tenant!.schemaName, parsed.data.dni);
    if (existing) {
      return res.status(409).json({ error: `Ya existe un estudiante con DNI ${parsed.data.dni}` });
    }

    const student = await studentsRepository.create(req.tenant!.schemaName, parsed.data);
    return res.status(201).json(student);
  },

  async list(req: Request, res: Response) {
    const parsed = listStudentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await studentsRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(result);
  },

    async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const related = await studentsRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...student,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

  async getCourses(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const enrollments = await enrollmentsRepository.listByStudent(
      req.tenant!.schemaName,
      id,
    );
    res.json({ items: enrollments, total: enrollments.length });
  },

  async getParents(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const links = await studentParentsRepository.listByStudent(req.tenant!.schemaName, id);
    res.json({ items: links, total: links.length });
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const student = await studentsRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(student);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.deactivate(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(student);
  },

  async createAccount(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    if (student.userId) {
      return res.status(409).json({ error: 'Este estudiante ya tiene una cuenta asignada' });
    }

    let userId: string;
    const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });

    if (existingUser) {
      const otherStudent = await studentsRepository.findByUserId(
        req.tenant!.schemaName,
        existingUser.id,
      );
      if (otherStudent) {
        return res.status(409).json({
          error: 'Este usuario ya está vinculado a otro estudiante en este colegio',
        });
      }
      userId = existingUser.id;
    } else {
      const passwordHash = await hashPassword(parsed.data.password);
      const newUser = await prisma.user.create({
        data: {
          email: parsed.data.email,
          passwordHash,
          fullName: `${student.firstName} ${student.lastName}`,
        },
      });
      userId = newUser.id;
    }

    await prisma.organizationUser.upsert({
      where: {
        organizationId_userId_role: {
          organizationId: req.tenant!.id,
          userId,
          role: 'estudiante',
        },
      },
      update: { isActive: true },
      create: {
        organizationId: req.tenant!.id,
        userId,
        role: 'estudiante',
      },
    });

    const updated = await studentsRepository.linkUser(req.tenant!.schemaName, id, userId);

    res.status(201).json({
      ...updated,
      credentials: existingUser
        ? { note: 'Usuario existente reutilizado' }
        : { email: parsed.data.email, temporaryPassword: parsed.data.password },
    });
  },

  async resetPassword(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });
    if (!student.userId) {
      return res.status(404).json({ error: 'Este estudiante no tiene cuenta asignada' });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: student.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  },
    async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    if (student.isActive) {
      return res.status(409).json({ error: 'El estudiante ya está activo' });
    }

    const updated = await studentsRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
  },

  async hardDelete(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    if (student.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar un estudiante activo. Desactívalo primero.',
      });
    }

    const related = await studentsRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el estudiante tiene datos asociados (${related.total} registros).`,
        breakdown: related.breakdown,
      });
    }

    const deleted = await studentsRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Estudiante eliminado definitivamente', student: deleted });
  },
};