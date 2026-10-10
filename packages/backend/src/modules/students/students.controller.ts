import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import {
  hashPassword,
  generateRandomPassword,
} from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from './students.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import {
  createStudentSchema,
  bulkCreateStudentSchema,
  listStudentsQuerySchema,
  updateStudentSchema,
  changeSectionSchema,
} from './students.schemas';

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).default('Cambiar123!'),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const studentsController = {
  /**
   * POST /api/students
   */
  async create(req: Request, res: Response) {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const schemaName = req.tenant!.schemaName;
    const organizationId = req.tenant!.id;

    // Validar DNI único
    const existingDni = await studentsRepository.findByDni(schemaName, input.dni);
    if (existingDni) {
      return res.status(409).json({ error: `Ya existe un estudiante con DNI ${input.dni}` });
    }

    // Validar email único global
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (existingUser) {
      const existingStudent = await studentsRepository.findByUserId(schemaName, existingUser.id);
      if (existingStudent) {
        return res.status(409).json({
          error: 'Este correo ya está vinculado a otro estudiante en este colegio',
        });
      }
      return res.status(409).json({
        error: 'Este correo ya está registrado en el sistema. Usa otro correo.',
      });
    }

    const generatedPassword = generateRandomPassword();

    try {
      const passwordHash = await hashPassword(generatedPassword);
      const newUser = await prisma.user.create({
        data: {
          email: input.email.toLowerCase().trim(),
          passwordHash,
          fullName: input.fullName,
          mustChangePassword: true,
        },
      });

      await prisma.organizationUser.create({
        data: {
          organizationId,
          userId: newUser.id,
          role: 'estudiante',
        },
      });

      const student = await studentsRepository.create(schemaName, input);
      const linked = await studentsRepository.linkUser(schemaName, student.id, newUser.id);

      return res.status(201).json({
        ...linked,
        credentials: {
          email: input.email.toLowerCase().trim(),
          temporaryPassword: generatedPassword,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear estudiante';
      console.error('❌ Error creando estudiante:', msg);
      return res.status(400).json({ error: msg });
    }
  },

  /**
   * POST /api/students/bulk
   */
  async bulkCreate(req: Request, res: Response) {
    const parsed = bulkCreateStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const { sectionId, students } = parsed.data;
    const schemaName = req.tenant!.schemaName;
    const organizationId = req.tenant!.id;

    // Duplicados internos (DNI y email)
    const dniSet = new Set<string>();
    const emailSet = new Set<string>();
    const internalDupes: Array<{ row: number; field: string; value: string }> = [];

    students.forEach((s, idx) => {
      const dni = s.dni.trim();
      const email = s.email.trim().toLowerCase();
      if (dniSet.has(dni)) {
        internalDupes.push({ row: idx + 1, field: 'dni', value: dni });
      } else {
        dniSet.add(dni);
      }
      if (emailSet.has(email)) {
        internalDupes.push({ row: idx + 1, field: 'email', value: email });
      } else {
        emailSet.add(email);
      }
    });

    if (internalDupes.length > 0) {
      return res.status(400).json({
        error: 'Hay duplicados dentro del formulario',
        duplicates: internalDupes,
      });
    }

    // Duplicados vs BD (DNI)
    const existingStudentsByDni = await prisma.$queryRawUnsafe<Array<{ dni: string }>>(
      `SELECT dni FROM "${schemaName}".students WHERE dni = ANY($1::varchar[])`,
      [...dniSet],
    );
    const existingDnis = new Set(existingStudentsByDni.map((s) => s.dni));

    // Duplicados vs BD (email)
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: [...emailSet] } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    // Validar sección
    const sectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".sections WHERE id = $1::uuid AND is_active = true LIMIT 1`,
      sectionId,
    );
    if (!sectionRows[0]) {
      return res.status(400).json({ error: 'La sección seleccionada no existe o está inactiva' });
    }

    // Validar apoderados
    const guardianIds = [...new Set(students.map((s) => s.guardianId))];
    const validParents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".parents
        WHERE id = ANY($1::uuid[]) AND is_active = true`,
      guardianIds,
    );
    const validParentIds = new Set(validParents.map((p) => p.id));

    // Conflictos
    const conflicts: Array<{ row: number; field: string; value: string; reason: string }> = [];
    students.forEach((s, idx) => {
      const dni = s.dni.trim();
      const email = s.email.trim().toLowerCase();
      if (existingDnis.has(dni)) {
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
          reason: 'Correo ya registrado en el sistema',
        });
      }
      if (!validParentIds.has(s.guardianId)) {
        conflicts.push({
          row: idx + 1,
          field: 'guardianId',
          value: s.guardianId,
          reason: 'Apoderado no encontrado o inactivo',
        });
      }
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        error: 'Hay conflictos con datos ya existentes',
        conflicts,
      });
    }

    // Crear uno por uno
    const results: Array<{
      row: number;
      dni: string;
      fullName: string;
      email: string;
      password: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const password = generateRandomPassword();

      try {
        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
          data: {
            email: s.email.trim().toLowerCase(),
            passwordHash,
            fullName: s.fullName.trim(),
            mustChangePassword: true,
          },
        });

        await prisma.organizationUser.create({
          data: {
            organizationId,
            userId: user.id,
            role: 'estudiante',
          },
        });

        const student = await studentsRepository.create(schemaName, {
          fullName: s.fullName.trim(),
          dni: s.dni.trim(),
          birthDate: s.birthDate || null,
          gender: s.gender ?? null,
          email: s.email.trim().toLowerCase(),
          phone: s.phone || null,
          address: s.address || null,
          sectionId,
          guardianId: s.guardianId,
        });

        await studentsRepository.linkUser(schemaName, student.id, user.id);

        results.push({
          row: i + 1,
          dni: s.dni.trim(),
          fullName: s.fullName.trim(),
          email: s.email.trim().toLowerCase(),
          password,
          ok: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        results.push({
          row: i + 1,
          dni: s.dni,
          fullName: s.fullName,
          email: s.email,
          password: '',
          ok: false,
          error: msg,
        });
      }
    }

    const created = results.filter((r) => r.ok);
    const failed = results.filter((r) => !r.ok);

    return res.status(201).json({
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

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    // Si cambia el email, actualizar user global
    if (parsed.data.email && parsed.data.email.toLowerCase() !== student.email?.toLowerCase()) {
      if (!student.userId) {
        return res.status(400).json({
          error: 'No se puede cambiar el correo: el estudiante no tiene cuenta de usuario',
        });
      }
      const existing = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase().trim() },
      });
      if (existing && existing.id !== student.userId) {
        return res.status(409).json({ error: 'Ese correo ya está en uso por otro usuario' });
      }
      await prisma.user.update({
        where: { id: student.userId },
        data: { email: parsed.data.email.toLowerCase().trim() },
      });
    }

    const updated = await studentsRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!updated) return res.status(404).json({ error: 'Estudiante no encontrado' });
    res.json(updated);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const deactivated = await studentsRepository.deactivate(req.tenant!.schemaName, id);

    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { isActive: false },
      });
    }

    res.json(deactivated);
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

    if (student.userId) {
      await prisma.user.update({
        where: { id: student.userId },
        data: { isActive: true },
      });
    }

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

    const userId = student.userId;
    const deleted = await studentsRepository.hardDelete(req.tenant!.schemaName, id);

    if (userId) {
      await prisma.organizationUser.deleteMany({
        where: { userId, organizationId: req.tenant!.id, role: 'estudiante' },
      });
      const remaining = await prisma.organizationUser.count({ where: { userId } });
      if (remaining === 0) {
        await prisma.user.delete({ where: { id: userId } });
      }
    }

    res.json({
      message: 'Estudiante eliminado definitivamente',
      student: deleted,
      userDeleted: userId ? true : false,
    });
  },

  /**
   * POST /api/students/:id/create-account
   * Legacy por si algún estudiante quedó sin cuenta.
   */
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
          fullName: student.fullName,
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

  /**
   * POST /api/students/:id/change-section
   * Cambia al estudiante de sección y cierra el período en el historial.
   */
  async changeSection(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = changeSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const result = await studentsRepository.changeSection(
      req.tenant!.schemaName,
      id,
      parsed.data.newSectionId,
      parsed.data.reason,
    );

    if ('error' in result) {
      return res.status(409).json(result);
    }

    return res.status(200).json(result);
  },

  /**
   * GET /api/students/:id/section-history
   * Devuelve el historial de secciones del estudiante.
   */
  async getSectionHistory(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, id);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const history = await studentsRepository.getSectionHistory(
      req.tenant!.schemaName,
      id,
    );

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        dni: student.dni,
      },
      items: history,
      total: history.length,
    });
  },
};