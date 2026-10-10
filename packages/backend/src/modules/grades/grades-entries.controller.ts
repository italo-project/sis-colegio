import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import { evaluationsRepository, gradeCategoriesRepository } from './grades.repository';
import { gradeEntriesRepository } from './grades-entries.repository';
import { canManageEvaluation } from './grades.helpers';
import { computeAverages } from './grades-entries.helpers';
import {
  bulkGradeEntriesSchema,
  upsertGradeEntrySchema,
} from './grades-entries.schemas';

export const gradeEntriesController = {
  /**
   * PUT /api/grades/evaluations/:evaluationId/grades/:studentId
   */
  async upsert(req: Request, res: Response) {
    const evaluationId = getStringParam(req, res, 'evaluationId');
    if (!evaluationId) return;
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const parsed = upsertGradeEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageEvaluation(
      req,
      evaluationId,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const student = await studentsRepository.findById(req.tenant!.schemaName, studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
    }

    const evaluation = await evaluationsRepository.findById(
      req.tenant!.schemaName,
      evaluationId,
    );
    if (!evaluation) return res.status(404).json({ error: 'Evaluación no encontrada' });

    if (parsed.data.score !== undefined && parsed.data.score !== null) {
      if (parsed.data.score > evaluation.maxScore) {
        return res.status(400).json({
          error: `La nota no puede superar el máximo de la evaluación (${evaluation.maxScore})`,
        });
      }
    }

    const category = await gradeCategoriesRepository.findById(
      req.tenant!.schemaName,
      evaluation.categoryId,
    );
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });

    const enrollment = await enrollmentsRepository.findByCourseAndStudent(
      req.tenant!.schemaName,
      category.courseId,
      studentId,
    );
    if (!enrollment || enrollment.status !== 'active') {
      return res.status(400).json({
        error: 'El estudiante no está matriculado en el curso de esta evaluación',
      });
    }

    const entry = await gradeEntriesRepository.upsert(
      req.tenant!.schemaName,
      evaluationId,
      studentId,
      parsed.data.score ?? null,
      parsed.data.feedback,
      req.user!.userId,
    );

    res.json(entry);
  },

  /**
   * POST /api/grades/evaluations/:evaluationId/grades/bulk
   */
  async bulk(req: Request, res: Response) {
    const evaluationId = getStringParam(req, res, 'evaluationId');
    if (!evaluationId) return;

    const parsed = bulkGradeEntriesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageEvaluation(
      req,
      evaluationId,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const evaluation = await evaluationsRepository.findById(
      req.tenant!.schemaName,
      evaluationId,
    );
    if (!evaluation) return res.status(404).json({ error: 'Evaluación no encontrada' });

    const category = await gradeCategoriesRepository.findById(
      req.tenant!.schemaName,
      evaluation.categoryId,
    );
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });

    const enrollments = await enrollmentsRepository.listByCourse(
      req.tenant!.schemaName,
      category.courseId,
    );
    const enrolledIds = new Set(enrollments.map((e) => e.studentId));

    const results: Array<{ studentId: string; ok: boolean; error?: string }> = [];
    const validEntries: typeof parsed.data.grades = [];

    for (const g of parsed.data.grades) {
      if (!enrolledIds.has(g.studentId)) {
        results.push({
          studentId: g.studentId,
          ok: false,
          error: 'Estudiante no matriculado en el curso',
        });
        continue;
      }
      if (g.score !== null && g.score > evaluation.maxScore) {
        results.push({
          studentId: g.studentId,
          ok: false,
          error: `La nota supera el máximo (${evaluation.maxScore})`,
        });
        continue;
      }
      validEntries.push(g);
    }

    for (const g of validEntries) {
      await gradeEntriesRepository.upsert(
        req.tenant!.schemaName,
        evaluationId,
        g.studentId,
        g.score,
        g.feedback,
        req.user!.userId,
      );
      results.push({ studentId: g.studentId, ok: true });
    }

    const saved = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    res.json({
      evaluationId,
      saved,
      failed,
      results,
    });
  },

  /**
   * GET /api/grades/evaluations/:evaluationId/grades
   */
  async listByEvaluation(req: Request, res: Response) {
    const evaluationId = getStringParam(req, res, 'evaluationId');
    if (!evaluationId) return;

    const access = await canManageEvaluation(
      req,
      evaluationId,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const evaluation = await evaluationsRepository.findById(
      req.tenant!.schemaName,
      evaluationId,
    );
    if (!evaluation) return res.status(404).json({ error: 'Evaluación no encontrada' });

    const category = await gradeCategoriesRepository.findById(
      req.tenant!.schemaName,
      evaluation.categoryId,
    );
    if (!category) return res.status(404).json({ error: 'Categoría no encontrada' });

    const enrollments = await enrollmentsRepository.listByCourse(
      req.tenant!.schemaName,
      category.courseId,
    );

    const entries = await gradeEntriesRepository.listByEvaluation(
      req.tenant!.schemaName,
      evaluationId,
    );
    const entriesByStudent = new Map(entries.map((e) => [e.studentId, e]));

    const rows = enrollments.map((enr) => ({
      student: enr.student,
      grade: entriesByStudent.get(enr.studentId) ?? null,
    }));

    res.json({
      evaluation: {
        id: evaluation.id,
        name: evaluation.name,
        maxScore: evaluation.maxScore,
        weight: evaluation.weight,
        evaluationDate: evaluation.evaluationDate,
      },
      rows,
      total: rows.length,
    });
  },

  /**
   * GET /api/grades/courses/:courseId/students/:studentId/grades
   */
  async listByStudentAndCourse(req: Request, res: Response) {
    const courseId = getStringParam(req, res, 'courseId');
    if (!courseId) return;
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const student = await studentsRepository.findById(req.tenant!.schemaName, studentId);
    if (!student) return res.status(404).json({ error: 'Estudiante no encontrado' });

    const entries = await gradeEntriesRepository.listByStudentAndCourse(
      req.tenant!.schemaName,
      studentId,
      courseId,
    );

    const averages = computeAverages(
      entries.map((e) => ({
        score: e.score,
        evaluationMaxScore: e.evaluationMaxScore,
        evaluationWeight: e.evaluationWeight,
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        categoryWeight: e.categoryWeight,
      })),
    );

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
      },
      entries: entries.map((e) => ({
        id: e.id,
        score: e.score,
        feedback: e.feedback,
        gradedAt: e.gradedAt,
        categoryId: e.categoryId,
        categoryName: e.categoryName,
        categoryWeight: e.categoryWeight,
        evaluationId: e.evaluationId,
        evaluationName: e.evaluationName,
        evaluationWeight: e.evaluationWeight,
        evaluationDate: e.evaluationDate,
        evaluationMaxScore: e.evaluationMaxScore,
      })),
      averages,
    });
  },

  /**
   * DELETE /api/grades/evaluations/:evaluationId/grades/:studentId
   */
  async remove(req: Request, res: Response) {
    const evaluationId = getStringParam(req, res, 'evaluationId');
    if (!evaluationId) return;
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const access = await canManageEvaluation(
      req,
      evaluationId,
      evaluationsRepository,
      gradeCategoriesRepository,
    );
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const deleted = await gradeEntriesRepository.delete(
      req.tenant!.schemaName,
      evaluationId,
      studentId,
    );
    if (!deleted) return res.status(404).json({ error: 'Nota no encontrada' });

    res.json({ message: 'Nota eliminada', entry: deleted });
  },
};