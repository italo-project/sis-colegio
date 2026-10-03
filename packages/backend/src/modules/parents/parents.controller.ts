import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import { getStringParam } from '../../utils/params';
import { parentsRepository } from './parents.repository';
import { studentParentsRepository } from '../student-parents/student-parents.repository';
import {
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

    let userId: string;
    if (existingUser) {
      const existingParent = await parentsRepository.findByUserId(
        req.tenant!.schemaName,
        existingUser.id,
      );
      if (existingParent) {
        return res.status(409).json({ error: 'Este usuario ya está registrado como padre' });
      }
      userId = existingUser.id;
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
      credentials: existingUser
        ? { note: 'Usuario existente reutilizado' }
        : { email: input.email, temporaryPassword: input.password },
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
    const parent = await parentsRepository.update(req.tenant!.schemaName, id, parsed.data);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });
    res.json(parent);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.deactivate(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });
    res.json(parent);
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
    async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parent = await parentsRepository.findById(req.tenant!.schemaName, id);
    if (!parent) return res.status(404).json({ error: 'Padre no encontrado' });

    if (parent.isActive) {
      return res.status(409).json({ error: 'El padre ya está activo' });
    }

    const updated = await parentsRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
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

    const deleted = await parentsRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Padre eliminado definitivamente', parent: deleted });
  },
};