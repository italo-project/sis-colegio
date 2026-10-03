import { Request, Response } from 'express';
import { coursesRepository } from '../courses/courses.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import { studentsRepository } from '../students/students.repository';
import { gradeEntriesRepository } from './grades-entries.repository';
import { computeAverages } from './grades-entries.helpers';

/**
 * Obtiene todas las notas de un estudiante en todos sus cursos activos,
 * agrupadas por curso, con promedios por categoría y promedio final.
 */
export const getStudentGradesReport = async (
  schemaName: string,
  studentId: string,
): Promise<{
  student: { id: string; firstName: string; lastName: string; dni: string };
  courses: Array<{
    course: {
      id: string;
      academicYear: { year: number };
      section: { name: string };
      gradeLevel: { code: string; name: string; level: string };
      subject: { code: string; name: string };
      teacher: { firstName: string; lastName: string };
    };
    entries: Array<{
      id: string;
      score: number | null;
      feedback: string | null;
      gradedAt: Date | null;
      categoryId: string;
      categoryName: string;
      categoryWeight: number;
      evaluationId: string;
      evaluationName: string;
      evaluationWeight: number;
      evaluationDate: Date | null;
      evaluationMaxScore: number;
    }>;
    averages: ReturnType<typeof computeAverages>;
  }>;
}> => {
  const student = await studentsRepository.findById(schemaName, studentId);
  if (!student) throw new Error('Estudiante no encontrado');

  // Cursos del estudiante (matrículas activas)
  const enrollments = await enrollmentsRepository.listByStudent(schemaName, studentId);

  const courses = [];

  for (const enr of enrollments) {
    const entries = await gradeEntriesRepository.listByStudentAndCourse(
      schemaName,
      studentId,
      enr.courseId,
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

    courses.push({
      course: {
        id: enr.courseId,
        academicYear: enr.course.academicYear,
        section: enr.course.section,
        gradeLevel: enr.course.gradeLevel,
        subject: enr.course.subject,
        teacher: enr.course.teacher,
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
  }

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dni: student.dni,
    },
    courses,
  };
};

/**
 * Obtiene las notas de un estudiante en un curso específico.
 * Valida que el estudiante esté matriculado en ese curso.
 */
export const getStudentCourseGrades = async (
  schemaName: string,
  studentId: string,
  courseId: string,
) => {
  const student = await studentsRepository.findById(schemaName, studentId);
  if (!student) throw new Error('Estudiante no encontrado');

  const enrollment = await enrollmentsRepository.findByCourseAndStudent(
    schemaName,
    courseId,
    studentId,
  );
  if (!enrollment || enrollment.status !== 'active') {
    throw new Error('El estudiante no está matriculado en este curso');
  }

  const course = await coursesRepository.findDetailedById(schemaName, courseId);
  if (!course) throw new Error('Curso no encontrado');

  const entries = await gradeEntriesRepository.listByStudentAndCourse(
    schemaName,
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

  return {
    student: {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dni: student.dni,
    },
    course: {
      id: course.id,
      academicYear: course.academicYear,
      section: course.section,
      subject: course.subject,
      teacher: course.teacher,
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
  };
};