import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';

type GradeEntryRow = {
  id: string;
  evaluation_id: string;
  student_id: string;
  score: string | null; // NUMERIC
  feedback: string | null;
  graded_by: string | null;
  graded_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: GradeEntryRow) => ({
  id: row.id,
  evaluationId: row.evaluation_id,
  studentId: row.student_id,
  score: row.score !== null ? Number(row.score) : null,
  feedback: row.feedback,
  gradedBy: row.graded_by,
  gradedAt: row.graded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const gradeEntriesRepository = {
  /**
   * Crea o actualiza la nota de un estudiante en una evaluación.
   */
  async upsert(
    schemaName: string,
    evaluationId: string,
    studentId: string,
    score: number | null,
    feedback: string | undefined,
    gradedBy: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeEntryRow[]>(
      `INSERT INTO "${schemaName}".grade_entries
         (evaluation_id, student_id, score, feedback, graded_by, graded_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, now())
       ON CONFLICT (evaluation_id, student_id) DO UPDATE SET
         score = EXCLUDED.score,
         feedback = COALESCE(EXCLUDED.feedback, "${schemaName}".grade_entries.feedback),
         graded_by = EXCLUDED.graded_by,
         graded_at = now(),
         updated_at = now()
       RETURNING *`,
      evaluationId,
      studentId,
      score,
      feedback ?? null,
      gradedBy,
    );
    return toApi(rows[0]);
  },

  async findByEvaluationAndStudent(schemaName: string, evaluationId: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeEntryRow[]>(
      `SELECT * FROM "${schemaName}".grade_entries
       WHERE evaluation_id = $1::uuid AND student_id = $2::uuid LIMIT 1`,
      evaluationId,
      studentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async listByEvaluation(schemaName: string, evaluationId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeEntryRow[]>(
      `SELECT * FROM "${schemaName}".grade_entries WHERE evaluation_id = $1::uuid`,
      evaluationId,
    );
    return rows.map(toApi);
  },

  async delete(schemaName: string, evaluationId: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeEntryRow[]>(
      `DELETE FROM "${schemaName}".grade_entries
       WHERE evaluation_id = $1::uuid AND student_id = $2::uuid RETURNING *`,
      evaluationId,
      studentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Devuelve todas las notas de un estudiante en un curso, con datos
   * de la evaluación y la categoría, para poder calcular promedios.
   */
  async listByStudentAndCourse(schemaName: string, studentId: string, courseId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<
        GradeEntryRow & {
          category_id: string;
          category_name: string;
          category_weight: string;
          evaluation_name: string;
          evaluation_weight: string;
          evaluation_date: Date | null;
          evaluation_max_score: string;
        }
      >
    >(
      `SELECT
         ge.*,
         gc.id AS category_id,
         gc.name AS category_name,
         gc.weight AS category_weight,
         e.name AS evaluation_name,
         e.weight AS evaluation_weight,
         e.evaluation_date AS evaluation_date,
         e.max_score AS evaluation_max_score
       FROM "${schemaName}".grade_entries ge
       JOIN "${schemaName}".evaluations e ON e.id = ge.evaluation_id
       JOIN "${schemaName}".grade_categories gc ON gc.id = e.category_id
       WHERE ge.student_id = $1::uuid
         AND gc.course_id = $2::uuid
         AND e.is_active = true
         AND gc.is_active = true
       ORDER BY gc.order_index ASC, e.evaluation_date ASC NULLS LAST, e.name ASC`,
      studentId,
      courseId,
    );

    return rows.map((row) => ({
      ...toApi(row),
      categoryId: row.category_id,
      categoryName: row.category_name,
      categoryWeight: Number(row.category_weight),
      evaluationName: row.evaluation_name,
      evaluationWeight: Number(row.evaluation_weight),
      evaluationDate: row.evaluation_date,
      evaluationMaxScore: Number(row.evaluation_max_score),
    }));
  },
};