import { teachersRepository } from '../teachers/teachers.repository';
import { coursesRepository } from '../courses/courses.repository';
import type { Request } from 'express';

/**
 * Verifica si el usuario autenticado puede gestionar el curso indicado.
 * - CEO: siempre puede
 * - Docente: solo si es el docente asignado al curso
 * - Otros roles: nunca
 */
export const canManageCourse = async (
  req: Request,
  courseId: string,
): Promise<{ allowed: boolean; reason?: string }> => {
  const user = req.user!;
  const schema = req.tenant!.schemaName;

  if (user.role === 'ceo') {
    return { allowed: true };
  }

  if (user.role === 'docente') {
    const teacher = await teachersRepository.findByUserId(schema, user.userId);
    if (!teacher) {
      return { allowed: false, reason: 'No estás registrado como docente' };
    }

    const course = await coursesRepository.findById(schema, courseId);
    if (!course) {
      return { allowed: false, reason: 'Curso no encontrado' };
    }

    if (course.teacherId !== teacher.id) {
      return { allowed: false, reason: 'No eres el docente asignado a este curso' };
    }

    return { allowed: true };
  }

  return { allowed: false, reason: 'Rol no autorizado para gestionar evaluaciones' };
};

/**
 * Verifica si el usuario puede gestionar la categoría indicada.
 * Se resuelve a partir del course_id de la categoría.
 */
export const canManageCategory = async (
  req: Request,
  categoryId: string,
  gradeCategoriesRepo: {
    findById: (schema: string, id: string) => Promise<{ courseId: string } | null>;
  },
): Promise<{ allowed: boolean; reason?: string }> => {
  const category = await gradeCategoriesRepo.findById(req.tenant!.schemaName, categoryId);
  if (!category) {
    return { allowed: false, reason: 'Categoría no encontrada' };
  }
  return canManageCourse(req, category.courseId);
};

/**
 * Verifica si el usuario puede gestionar la evaluación indicada.
 * Se resuelve a partir de la categoría → curso de la evaluación.
 */
export const canManageEvaluation = async (
  req: Request,
  evaluationId: string,
  evaluationsRepo: {
    findById: (schema: string, id: string) => Promise<{ categoryId: string } | null>;
  },
  gradeCategoriesRepo: {
    findById: (schema: string, id: string) => Promise<{ courseId: string } | null>;
  },
): Promise<{ allowed: boolean; reason?: string }> => {
  const evaluation = await evaluationsRepo.findById(req.tenant!.schemaName, evaluationId);
  if (!evaluation) {
    return { allowed: false, reason: 'Evaluación no encontrada' };
  }
  const category = await gradeCategoriesRepo.findById(
    req.tenant!.schemaName,
    evaluation.categoryId,
  );
  if (!category) {
    return { allowed: false, reason: 'Categoría no encontrada' };
  }
  return canManageCourse(req, category.courseId);
};