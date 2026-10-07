import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { hashPassword, generateRandomPassword } from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { teachersRepository } from './teachers.repository';
import {
  bulkCreateTeachersSchema,
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

    const existingDni = await teachersRepository.findByDni(req.tenant!.schemaName, input.dni);
    if (existingDni) {
      return res.status(409).json({ error: `Ya existe un docente con DNI ${input.dni}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    const generatedPassword = generateRandomPassword();

    let userId: string;
    let isExistingUser = false;

    if (existingUser) {
      const existingTeacher = await teachersRepository.findByUserId(
        req.tenant!.schemaName,
        existingUser.id,
      );
      if (existingTeacher) {
        return res.status(409).json({ error: 'Este usuario ya es docente en este colegio' });
      }
      userId = existingUser.id;
      isExistingUser = true;
    } else {
      const passwordHash = await hashPassword(generatedPassword);
      const newUser = await prisma.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.fullName,
          mustChangePassword: true,
        },
      });
      userId = newUser.id;
    }

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

    const teacher = await teachersRepository.create(req.tenant!.schemaName, userId, input);

    res.status(201).json({
      ...teacher,
      credentials: isExistingUser
        ? { note: 'Usuario existente reutilizado' }
        : { email: input.email, temporaryPassword: generatedPassword },
    });
  },

  async bulkCreate(req: Request, res: Response) {
    const parsed = bulkCreateTeachersSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const { teachers } = parsed.data;
    const schemaName = req.tenant!.schemaName;

    // 1. Duplicados internos
    const dniSet = new Set<string>();
    const emailSet = new Set<string>();
    const internalDupes: Array<{ row: number; field: string; value: string }> = [];

    teachers.forEach((t, idx) => {
      const dni = t.dni.trim();
      const email = t.email.trim().toLowerCase();
      if (dniSet.has(dni)) internalDupes.push({ row: idx + 1, field: 'dni', value: dni });
      else dniSet.add(dni);
      if (emailSet.has(email)) internalDupes.push({ row: idx + 1, field: 'email', value: email });
      else emailSet.add(email);
    });

    if (internalDupes.length > 0) {
      return res.status(400).json({
        error: 'Hay duplicados dentro del formulario',
        duplicates: internalDupes,
      });
    }

    // 2. Duplicados vs BD
    const existingTeachersByDni = await teachersRepository.findByDnis(schemaName, [...dniSet]);
    const existingTeacherDnis = new Set(existingTeachersByDni.map((t) => t.dni));

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: [...emailSet] } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const conflicts: Array<{ row: number; field: string; value: string; reason: string }> = [];
    teachers.forEach((t, idx) => {
      const dni = t.dni.trim();
      const email = t.email.trim().toLowerCase();
      if (existingTeacherDnis.has(dni)) {
        conflicts.push({
          row: idx + 1,
          field: 'dni',
          value: dni,
          reason: 'DNI ya registrado en este colegio',
        });
      }
      if (existingEmails.has(email)) {
        conflicts.push({
          row: idx + 1,
          field: 'email',
          value: email,
          reason: 'Email ya registrado en el sistema',
        });
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Hay conflictos con datos ya existentes',
        conflicts,
      });
    }

    // 3. Crear
    const results: Array<{
      row: number;
      dni: string;
      fullName: string;
      email: string;
      password: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < teachers.length; i++) {
      const t = teachers[i];
      const password = generateRandomPassword();

      try {
        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
          data: {
            email: t.email.trim().toLowerCase(),
            passwordHash,
            fullName: t.fullName.trim(),
            mustChangePassword: true,
          },
        });

        await prisma.organizationUser.create({
          data: {
            organizationId: req.tenant!.id,
            userId: user.id,
            role: 'docente',
          },
        });

        await teachersRepository.create(schemaName, user.id, {
          email: t.email.trim().toLowerCase(),
          fullName: t.fullName.trim(),
          dni: t.dni.trim(),
          phone: t.phone?.trim() || undefined,
          birthDate: t.birthDate?.trim() || undefined,
          address: t.address?.trim() || undefined,
        });

        results.push({
          row: i + 1,
          dni: t.dni.trim(),
          fullName: t.fullName.trim(),
          email: t.email.trim().toLowerCase(),
          password,
          ok: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        results.push({
          row: i + 1,
          dni: t.dni,
          fullName: t.fullName,
          email: t.email,
          password: '',
          ok: false,
          error: msg,
        });
      }
    }

    const created = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    res.status(201).json({
      created: created.length,
      failed: failed.length,
      credentials: created.map((c) => ({
        row: c.row,
        fullName: c.fullName,
        dni: c.dni,
        email: c.email,
        password: c.password,
      })),
      errors: failed,
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
    const weeklyHours = await teachersRepository.getWeeklyHoursTotal(req.tenant!.schemaName, id);

    res.json({
      ...teacher,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
      weeklyHoursTotal: weeklyHours,
    });
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const teacher = await teachersRepository.findById(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });

    // Si viene password, actualizarla
    if (parsed.data.password && parsed.data.password.trim().length >= 8) {
      const passwordHash = await hashPassword(parsed.data.password);
      await prisma.user.update({
        where: { id: teacher.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      });
    }

    // Actualizar los demás campos
    const { password, ...updateData } = parsed.data;
    const updated = await teachersRepository.update(
      req.tenant!.schemaName,
      id,
      updateData,
    );
    if (!updated) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(updated);
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

    const teacher = await teachersRepository.reactivate(req.tenant!.schemaName, id);
    if (!teacher) return res.status(404).json({ error: 'Docente no encontrado' });
    res.json(teacher);
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

    const userId = teacher.userId;
    const deleted = await teachersRepository.hardDelete(req.tenant!.schemaName, id);

    await prisma.organizationUser.deleteMany({
      where: { userId, organizationId: req.tenant!.id, role: 'docente' },
    });

    const remainingMemberships = await prisma.organizationUser.count({
      where: { userId },
    });

    if (remainingMemberships === 0) {
      await prisma.user.delete({ where: { id: userId } });
    }

    res.json({
      message: 'Docente eliminado definitivamente',
      teacher: deleted,
      userDeleted: remainingMemberships === 0,
    });
  },
};