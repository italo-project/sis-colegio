import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateEvaluationInput,
  CreateGradeCategoryInput,
  UpdateEvaluationInput,
  UpdateGradeCategoryInput,
} from './grades.schemas';

// ── Categorías ───────────────────────────────────────────────
type GradeCategoryRow = {
  id: string;
  course_id: string;
  name: string;
  description: string | null;
  weight: string; // NUMERIC viene como string desde Prisma
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toCategoryApi = (row: GradeCategoryRow) => ({
  id: row.id,
  courseId: row.course_id,
  name: row.name,
  description: row.description,
  weight: Number(row.weight),
  orderIndex: row.order_index,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// ── Evaluaciones ─────────────────────────────────────────────
type EvaluationRow = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  evaluation_date: Date | null;
  weight: string;
  max_score: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toEvaluationApi = (row: EvaluationRow) => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  description: row.description,
  evaluationDate: row.evaluation_date,
  weight: Number(row.weight),
  maxScore: Number(row.max_score),
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const gradeCategoriesRepository = {
  async create(schemaName: string, courseId: string, input: CreateGradeCategoryInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `INSERT INTO "${schemaName}".grade_categories
        (course_id, name, description, weight, order_index)
       VALUES ($1::uuid, $2, $3, $4, $5)
       RETURNING *`,
      courseId,
      input.name,
      input.description ?? null,
      input.weight,
      input.orderIndex,
    );
    return toCategoryApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `SELECT * FROM "${schemaName}".grade_categories WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toCategoryApi(rows[0]) : null;
  },

  async findByName(schemaName: string, courseId: string, name: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `SELECT * FROM "${schemaName}".grade_categories
       WHERE course_id = $1::uuid AND name = $2 LIMIT 1`,
      courseId,
      name,
    );
    return rows[0] ? toCategoryApi(rows[0]) : null;
  },

  async listByCourse(schemaName: string, courseId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `SELECT * FROM "${schemaName}".grade_categories
       WHERE course_id = $1::uuid
       ORDER BY order_index ASC, name ASC`,
      courseId,
    );
    return rows.map(toCategoryApi);
  },

  async update(schemaName: string, id: string, input: UpdateGradeCategoryInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      name: 'name',
      description: 'description',
      weight: 'weight',
      orderIndex: 'order_index',
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `UPDATE "${schemaName}".grade_categories SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toCategoryApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<GradeCategoryRow[]>(
      `UPDATE "${schemaName}".grade_categories SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toCategoryApi(rows[0]) : null;
  },
};

export const evaluationsRepository = {
  async create(schemaName: string, categoryId: string, input: CreateEvaluationInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EvaluationRow[]>(
      `INSERT INTO "${schemaName}".evaluations
        (category_id, name, description, evaluation_date, weight, max_score)
       VALUES ($1::uuid, $2, $3, $4::date, $5, $6)
       RETURNING *`,
      categoryId,
      input.name,
      input.description ?? null,
      input.evaluationDate ?? null,
      input.weight,
      input.maxScore,
    );
    return toEvaluationApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EvaluationRow[]>(
      `SELECT * FROM "${schemaName}".evaluations WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toEvaluationApi(rows[0]) : null;
  },

  async listByCategory(schemaName: string, categoryId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EvaluationRow[]>(
      `SELECT * FROM "${schemaName}".evaluations
       WHERE category_id = $1::uuid
       ORDER BY evaluation_date ASC NULLS LAST, name ASC`,
      categoryId,
    );
    return rows.map(toEvaluationApi);
  },

  /**
   * Lista todas las evaluaciones de un curso con joins a categoría.
   * El nombre del esquema debe calificarse en cada tabla porque Prisma no aplica search_path.
   */
  async listByCourse(schemaName: string, courseId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<EvaluationRow & { category_name: string; category_weight: string; category_order: number }>
    >(
      `SELECT
         e.*,
         gc.name AS category_name,
         gc.weight AS category_weight,
         gc.order_index AS category_order
       FROM "${schemaName}".evaluations e
       JOIN "${schemaName}".grade_categories gc ON gc.id = e.category_id
       WHERE gc.course_id = $1::uuid AND gc.is_active = true
       ORDER BY gc.order_index ASC, gc.name ASC, e.evaluation_date ASC NULLS LAST, e.name ASC`,
      courseId,
    );
    return rows.map((row) => ({
      ...toEvaluationApi(row),
      categoryName: row.category_name,
      categoryWeight: Number(row.category_weight),
      categoryOrder: row.category_order,
    }));
  },

  async update(schemaName: string, id: string, input: UpdateEvaluationInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      name: { column: 'name' },
      description: { column: 'description' },
      evaluationDate: { column: 'evaluation_date', cast: '::date' },
      weight: { column: 'weight' },
      maxScore: { column: 'max_score' },
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, config] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value);
        fields.push(`${config.column} = $${params.length}${config.cast ?? ''}`);
      }
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<EvaluationRow[]>(
      `UPDATE "${schemaName}".evaluations SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toEvaluationApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EvaluationRow[]>(
      `UPDATE "${schemaName}".evaluations SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toEvaluationApi(rows[0]) : null;
  },
};