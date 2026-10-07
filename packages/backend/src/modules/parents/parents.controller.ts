import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { hashPassword, generateRandomPassword } from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { parentsRepository } from './parents.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import {
  bulkCreateParentsSchema,
  createParentSchema,
  listParentsQuerySchema,
  resetPasswordSchema,
  updateParentSchema,
} from './parents.schemas';

export const parentsController = {
  async create(req: Request, res: Response) {
    const parsed = createParentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;

    const existingDni = await parentsRepository.findByDni(req.tenant!.schemaName, input.dni);
    if (existingDni) {
      return res.status(409).json({ error: `Ya existe un padre con DNI ${input.dni}` });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });

    const generatedPassword = generateRandomPassword();

    let userId: string;
    let isExistingUser = false;

    if (existingUser) {
      const existingParent = await parentsRepository.findByUserId(
        req.tenant!.schemaName,
        existingUser.id,
      );
      if (existingParent) {
        return res.status(409).json({ error: 'Este usuario ya está registrado como padre' });
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
          role: 'padre',
        },
      },
      update: { isActive: true },
      create: {
        organizationId: req.tenant!.id,
        userId,
        role: 'padre',
      },
    });

    const parent = await parentsRepository.create(req.tenant!.schemaName, userId, input);

    res.status(201).json({
      ...parent,
      credentials: isExistingUser
        ? { note: 'Usuario existente reutilizado' }
        : { email: input.email, temporaryPassword: generatedPassword },
    });
  },

  async bulkCreate(req: Request, res: Response) {
    const parsed = bulkCreateParentsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const { parents } = parsed.data;
    const schemaName = req.tenant!.schemaName;

    // 1. Duplicados internos
    const dniSet = new Set<string>();
    const emailSet = new Set<string>();
    const internalDupes: Array<{ row: number; field: string; value: string }> = [];

    parents.forEach((p, idx) => {
      const dni = p.dni.trim();
      const email = p.email.trim().toLowerCase();
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
    const existingParentsByDni = await parentsRepository.findByDnis(schemaName, [...dniSet]);
    const existingParentDnis = new Set(existingParentsByDni.map((p) => p.dni));

    const existingUsers = await prisma.user.findMany({
      where: { email: { in: [...emailSet] } },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

    const conflicts: Array<{ row: number; field: string; value: string; reason: string }> = [];
    parents.forEach((p, idx) => {
      const dni = p.dni.trim();
      const email = p.email.trim().toLowerCase();
      if (existingParentDnis.has(dni)) {
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

    for (let i = 0; i < parents.length; i++) {
      const p = parents[i];
      const password = generateRandomPassword();

      try {
        const passwordHash = await hashPassword(password);

        const user = await prisma.user.create({
          data: {
            email: p.email.trim().toLowerCase(),
            passwordHash,
            fullName: p.fullName.trim(),
            mustChangePassword: true,
          },
        });

        await prisma.organizationUser.create({
          data: {
            organizationId: req.tenant!.id,
            userId: user.id,
            role: 'padre',
          },
        });

        await parentsRepository.create(schemaName, user.id, {
          email: p.email.trim().toLowerCase(),
          fullName: p.fullName.trim(),
          dni: p.dni.trim(),
          phone: p.phone?.trim() || undefined,
          address: p.address?.trim() || undefined,
        });

        results.push({
          row: i + 1,
          dni: p.dni.trim(),
          fullName: p.fullName.trim(),
          email: p.email.trim().toLowerCase(),
          password,
          ok: true,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        results.push({
          row: i + 1,
          dni: p.dni,
          fullName: p.fullName,
          email: p.email,
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
    const parsed = listParentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await parentsRepository.list(req.tenant!.schemaName, parsed.data);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    const related = await parentsRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...parent,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

    async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateParentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    // Si viene password, actualizarla
    if (parsed.data.password && parsed.data.password.trim().length >= 8) {
      const passwordHash = await hashPassword(parsed.data.password);
      await prisma.user.update({
        where: { id: parent.userId },
        data: {
          passwordHash,
          mustChangePassword: false, // El CEO la está poniendo, no queremos forzar cambio
        },
      });
    }

    // Actualizar los demás campos
    const { password, ...updateData } = parsed.data;
    const updated = await parentsRepository.update(
      req.tenant!.schemaName,
      id,
      updateData,
    );
    if (!updated) return res.status(404).json({ error: 'Padre no encontrado' });

    res.json(updated);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.deactivate(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });
    res.json(parent);
  },

  async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.reactivate(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });
    res.json(parent);
  },

  async hardDelete(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    if (parent.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar un padre activo. Desactívalo primero.',
      });
    }

    const related = await parentsRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: el padre tiene hijos vinculados (${related.total}).`,
        breakdown: related.breakdown,
      });
    }

    const userId = parent.userId;
    const deleted = await parentsRepository.hardDelete(req.tenant!.schemaName, id);

    await prisma.organizationUser.deleteMany({
      where: { userId, organizationId: req.tenant!.id, role: 'padre' },
    });

    const remainingMemberships = await prisma.organizationUser.count({
      where: { userId },
    });

    if (remainingMemberships === 0) {
      await prisma.user.delete({ where: { id: userId } });
    }

    res.json({
      message: 'Padre eliminado definitivamente',
      parent: deleted,
      userDeleted: remainingMemberships === 0,
    });
  },

  async resetPassword(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: parent.userId },
      data: { passwordHash },
    });

    res.json({ message: 'Contraseña actualizada correctamente' });
  },

  async getStudents(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    const links = await studentParentsRepository.listByParent(req.tenant!.schemaName, id);
    res.json({ items: links, total: links.length });
  },
};