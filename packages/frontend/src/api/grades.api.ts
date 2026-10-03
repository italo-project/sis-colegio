import { apiClient } from './client';
import type {
  CourseAverage,
  CourseGradeEntry,
  CreateEvaluationPayload,
  CreateGradeCategoryPayload,
  Evaluation,
  EvaluationSheet,
  GradeCategory,
  StudentGradesReport,
} from '@/types/grades';

export const gradesApi = {
  // ── Categorías ───────────────────────────────────────────
  async listCategories(courseId: string) {
    const { data } = await apiClient.get<{ items: GradeCategory[]; total: number }>(
      `/grades/courses/${courseId}/grade-categories`,
    );
    return data;
  },

  async createCategory(courseId: string, payload: CreateGradeCategoryPayload) {
    const { data } = await apiClient.post<GradeCategory>(
      `/grades/courses/${courseId}/grade-categories`,
      payload,
    );
    return data;
  },

  async updateCategory(id: string, payload: Partial<CreateGradeCategoryPayload>) {
    const { data } = await apiClient.patch<GradeCategory>(
      `/grades/grade-categories/${id}`,
      payload,
    );
    return data;
  },

  async deactivateCategory(id: string) {
    const { data } = await apiClient.delete<GradeCategory>(`/grades/grade-categories/${id}`);
    return data;
  },

  // ── Evaluaciones ─────────────────────────────────────────
  async listEvaluationsByCourse(courseId: string) {
    const { data } = await apiClient.get<{ items: Evaluation[]; total: number }>(
      `/grades/courses/${courseId}/evaluations`,
    );
    return data;
  },

  async createEvaluation(categoryId: string, payload: CreateEvaluationPayload) {
    const { data } = await apiClient.post<Evaluation>(
      `/grades/grade-categories/${categoryId}/evaluations`,
      payload,
    );
    return data;
  },

  async updateEvaluation(id: string, payload: Partial<CreateEvaluationPayload>) {
    const { data } = await apiClient.patch<Evaluation>(`/grades/evaluations/${id}`, payload);
    return data;
  },

  async deactivateEvaluation(id: string) {
    const { data } = await apiClient.delete<Evaluation>(`/grades/evaluations/${id}`);
    return data;
  },

  // ── Planilla y notas ─────────────────────────────────────
  async getEvaluationSheet(evaluationId: string) {
    const { data } = await apiClient.get<EvaluationSheet>(
      `/grades/evaluations/${evaluationId}/grades`,
    );
    return data;
  },

  async upsertGrade(evaluationId: string, studentId: string, score: number | null, feedback?: string) {
    const { data } = await apiClient.put(
      `/grades/evaluations/${evaluationId}/grades/${studentId}`,
      { score, feedback },
    );
    return data;
  },

  async bulkGrades(evaluationId: string, grades: Array<{ studentId: string; score: number | null; feedback?: string }>) {
    const { data } = await apiClient.post(
      `/grades/evaluations/${evaluationId}/grades/bulk`,
      { grades },
    );
    return data;
  },

  async deleteGrade(evaluationId: string, studentId: string) {
    const { data } = await apiClient.delete(
      `/grades/evaluations/${evaluationId}/grades/${studentId}`,
    );
    return data;
  },

  async getStudentGrades(courseId: string, studentId: string) {
    const { data } = await apiClient.get<StudentGradesReport>(
      `/grades/courses/${courseId}/students/${studentId}/grades`,
    );
    return data;
  },
};