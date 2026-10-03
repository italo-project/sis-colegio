import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { subjectsRepository } from './subjects.repository';
import {
  createSubjectSchema,
  listSubjectsQuerySchema,
  updateSubjectSchema,
} from './subjects.schemas';

export const subjectsController = {
  async create(req: Request, res: Response) {
    const parsed = createSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const existing = await subjectsRepository.findByCode(
      req.tenant!.schemaName,
      parsed.data.code,
    );
    if (existing) {
      return res.status(409).json({ error: `Ya existe una asignatura con código ${parsed.data.code}` });
    }

    const subject = await subjectsRepository.create(req.tenant!.schemaName, parsed.data);
    res.status(201).json(subject);
  },

  async list(req: Request, res: Response) {
    const parsed = listSubjectsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
  }
  const subjects = await subjectsRepository.list(req.tenant!.schemaName, parsed.data);
  res.json({ items: subjects, total: subjects.length });
  },

    async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const subject = await subjectsRepository.findById(req.tenant!.schemaName, id);
    if (!subject) return res.status(404).json({ error: 'Asignatura no encontrada' });

    const related = await subjectsRepository.countRelatedData(req.tenant!.schemaName, id);

    res.json({
      ...subject,
      canBeDeleted: related.total === 0,
      relatedDataCount: related.total,
      relatedBreakdown: related.breakdown,
    });
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const subject = await subjectsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!subject) return res.status(404).json({ error: 'Asignatura no encontrada' });
    res.json(subject);
  },

  async deactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const subject = await subjectsRepository.deactivate(req.tenant!.schemaName, id);
    if (!subject) return res.status(404).json({ error: 'Asignatura no encontrada' });
    res.json(subject);
  },
    async reactivate(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const subject = await subjectsRepository.findById(req.tenant!.schemaName, id);
    if (!subject) return res.status(404).json({ error: 'Asignatura no encontrada' });

    if (subject.isActive) {
      return res.status(409).json({ error: 'La asignatura ya está activa' });
    }

    const updated = await subjectsRepository.reactivate(req.tenant!.schemaName, id);
    res.json(updated);
  },

  async hardDelete(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const subject = await subjectsRepository.findById(req.tenant!.schemaName, id);
    if (!subject) return res.status(404).json({ error: 'Asignatura no encontrada' });

    if (subject.isActive) {
      return res.status(409).json({
        error: 'No se puede eliminar una asignatura activa. Desactívala primero.',
      });
    }

    const related = await subjectsRepository.countRelatedData(req.tenant!.schemaName, id);
    if (related.total > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: la asignatura tiene cursos asociados (${related.total}).`,
        breakdown: related.breakdown,
      });
    }

    const deleted = await subjectsRepository.hardDelete(req.tenant!.schemaName, id);
    res.json({ message: 'Asignatura eliminada definitivamente', subject: deleted });
  },
};