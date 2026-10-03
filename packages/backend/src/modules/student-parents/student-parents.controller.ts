import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { parentsRepository } from '../parents/parents.repository';
import { studentParentsRepository } from './student-parents.repository';
import {
  createStudentParentSchema,
  listStudentParentsQuerySchema,
  updateStudentParentSchema,
} from './student-parents.schemas';

export const studentParentsController = {
  async create(req: Request, res: Response) {
    const parsed = createStudentParentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const input = parsed.data;
    const schema = req.tenant!.schemaName;

    // Validar que estudiante y padre existen
    const student = await studentsRepository.findById(schema, input.studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
    }

    const parent = await parentsRepository.findById(schema, input.parentId);
    if (!parent || !parent.isActive) {
      return res.status(404).json({ error: 'Padre no encontrado o inactivo' });
    }

    // Validar que no exista ya la vinculación
    const existing = await studentParentsRepository.findByStudentAndParent(
      schema,
      input.studentId,
      input.parentId,
    );
    if (existing) {
      return res.status(409).json({ error: 'Esta vinculación ya existe' });
    }

    const link = await studentParentsRepository.create(schema, input);
    const detailed = await studentParentsRepository.findDetailedById(schema, link.id);
    res.status(201).json(detailed);
  },

  async list(req: Request, res: Response) {
    const parsed = listStudentParentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const links = await studentParentsRepository.list(req.tenant!.schemaName, parsed.data);
    res.json({ items: links, total: links.length });
  },

  async getById(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const link = await studentParentsRepository.findDetailedById(req.tenant!.schemaName, id);
    if (!link) return res.status(404).json({ error: 'Vinculación no encontrada' });
    res.json(link);
  },

  async update(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateStudentParentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }
    const link = await studentParentsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!link) return res.status(404).json({ error: 'Vinculación no encontrada' });
    res.json(link);
  },

  async remove(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const link = await studentParentsRepository.delete(req.tenant!.schemaName, id);
    if (!link) return res.status(404).json({ error: 'Vinculación no encontrada' });
    res.json({ message: 'Vinculación eliminada', link });
  },
};