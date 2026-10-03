import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { teachersRepository } from './teachers.repository';
import {
  createTeacherSchema,
  listTeachersQuerySchema,
  updateTeacherSchema,
} from './teachers.schemas';

export const teachersController = {
  async create(req: Request, res: Response) {
    const parsed = createTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;

    // 1. Verificar si el usuario global ya existe
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    // 2. Verificar si el DNI ya existe en este colegio
    const existingDni = await teachersRepository.findByDni(req.tenant!.schemaName, input.dni);
    if (existingDni) {
      return res.status(409).json({ error: `Ya existe un docente con DNI ${input.dni}` });
    }

    // 3. Crear o reutilizar el usuario global
    let userId: string;
    if (existingUser) {
      userId = existingUser.id;
      // Verificar que no esté ya como docente en este colegio
      const existingTeacher = await teachersRepository.findByUserId(
        req.tenant!.schemaName,
        userId,
      );
      if (existingTeacher) {
        return res.status(409).json({ error: 'Este usuario ya es docente en este colegio' });
      }
    } else {
      const passwordHash = await hashPassword(input.password);
      const newUser = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: `${input.firstName} ${input.lastName}`,
        },
      });
      userId = newUser.id;
    }

    // 4. Crear la membership con rol 'docente'
    await prisma.organizationUser.upsert({
      where: {
        organizationId_userId_role: {
          organizationId: req.tenant!.id,
          userId,
          role: 'docente',
        },
      },
      update: { isActive: true },
      create: {
        organizationId: req.tenant!.id,
        userId,
        role: 'docente',
      },
    });

    // 5. Crear el docente en el esquema del tenant
    const teacher = await teachersRepository.create(req.tenant!.schemaName, userId, input);

    res.status(201).json({
      ...teacher,
      credentials: existingUser
        ? { note: 'Usuario existente reutilizado' }
        : { email: input.email, temporaryPassword: input.password },
    });
  },

  async list(req: Request, res: Response) {
    const parsed = listTeachersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await teachersRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(result);
  },

   async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const teacher = await teachersRepository.findById(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });

    const related = await teachersRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...teacher,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const teacher = await teachersRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(teacher);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const teacher = await teachersRepository.deactivate(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(teacher);
  },
    async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const teacher = await teachersRepository.findById(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });

    if (teacher.isActive) {
      return res.status(409).json({ error: 'El docente ya está activo' });
    }

    const updated = await teachersRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
  },

  async hardDelete(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const teacher = await teachersRepository.findById(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });

    if (teacher.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar un docente activo. Desactívalo primero.',
      });
    }

    const related = await teachersRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el docente tiene cursos asignados (${related.total}).`,
        breakdown: related.breakdown,
      });
    }

    const deleted = await teachersRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Docente eliminado definitivamente', teacher: deleted });
  },
};