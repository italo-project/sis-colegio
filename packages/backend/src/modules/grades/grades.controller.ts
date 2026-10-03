import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { coursesRepository } from '../courses/courses.repository';
import { evaluationsRepository, gradeCategoriesRepository } from './grades.repository';
import {
  canManageCategory,
  canManageCourse,
  canManageEvaluation,
} from './grades.helpers';
import {
  createEvaluationSchema,
  createGradeCategorySchema,
  updateEvaluationSchema,
  updateGradeCategorySchema,
} from './grades.schemas';

export const gradesController = {
  // ── Categorías ─────────────────────────────────────────────

  /**
   * POST /api/courses/:courseId/grade-categories
   */
  async createCategory(req: Request, res: Response) {
    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;

    const parsed = createGradeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const course = await coursesRepository.findById(req.tenant!.schemaName, courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const access = await canManageCourse(req, courseId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const existing = await gradeCategoriesRepository.findByName(
      req.tenant!.schemaName,
      courseId,
      parsed.data.name,
    );
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre en este curso' });
    }

    const category = await gradeCategoriesRepository.create(
      req.tenant!.schemaName,
      courseId,
      parsed.data,
    );
    res.status(201).json(category);
  },

  /**
   * GET /api/courses/:courseId/grade-categories
   */
  async listCategories(req: Request, res: Response) {
    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;

    const course = await coursesRepository.findById(req.tenant!.schemaName, courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const categories = await gradeCategoriesRepository.listByCourse(
      req.tenant!.schemaName,
      courseId,
    );
    res.json({ items: categories, total: categories.length });
  },

  /**
   * PATCH /api/grade-categories/:id
   */
  async updateCategory(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateGradeCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageCategory(req, id, gradeCategoriesRepository);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const category = await gradeCategoriesRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(category);
  },

  /**
   * DELETE /api/grade-categories/:id
   */
  async deactivateCategory(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const access = await canManageCategory(req, id, gradeCategoriesRepository);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const category = await gradeCategoriesRepository.deactivate(req.tenant!.schemaName, id);
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });
    res.json(category);
  },

  // ── Evaluaciones ───────────────────────────────────────────

  /**
   * POST /api/grade-categories/:categoryId/evaluations
   */
  async createEvaluation(req: Request, res: Response) {
    const categoryId = getStringParam(req, res, 'categoryId');
    if (!categoryId) return;

    const parsed = createEvaluationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageCategory(req, categoryId, gradeCategoriesRepository);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const evaluation = await evaluationsRepository.create(
      req.tenant!.schemaName,
      categoryId,
      parsed.data,
    );
    res.status(201).json(evaluation);
  },

  /**
   * GET /api/grade-categories/:categoryId/evaluations
   */
  async listEvaluationsByCategory(req: Request, res: Response) {
    const categoryId = getStringParam(req, res, 'categoryId');
    if (!categoryId) return;

    const category = await gradeCategoriesRepository.findById(
      req.tenant!.schemaName,
      categoryId,
    );
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });

    const evaluations = await evaluationsRepository.listByCategory(
      req.tenant!.schemaName,
      categoryId,
    );
    res.json({ items: evaluations, total: evaluations.length });
  },

  /**
   * GET /api/courses/:courseId/evaluations
   */
  async listEvaluationsByCourse(req: Request, res: Response) {
    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;

    const course = await coursesRepository.findById(req.tenant!.schemaName, courseId);
    if (!course) return res.status(404).json({ error: 'Curso no encontrado' });

    const evaluations = await evaluationsRepository.listByCourse(
      req.tenant!.schemaName,
      courseId,
    );
    res.json({ items: evaluations, total: evaluations.length });
  },

  /**
   * PATCH /api/evaluations/:id
   */
  async updateEvaluation(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateEvaluationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageEvaluation(
      req,
      id,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const evaluation = await evaluationsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    if (!evaluation) return res.status(404).json({ error: 'Evaluación no encontrada' });
    res.json(evaluation);
  },

  /**
   * DELETE /api/evaluations/:id
   */
  async deactivateEvaluation(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const access = await canManageEvaluation(
      req,
      id,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const evaluation = await evaluationsRepository.deactivate(req.tenant!.schemaName, id);
    if (!evaluation) return res.status(404).json({ error: 'Evaluación no encontrada' });
    res.json(evaluation);
  },
};