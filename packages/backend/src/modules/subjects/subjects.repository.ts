import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateSubjectInput, ListSubjectsQuery, UpdateSubjectInput } from './subjects.schemas';

type SubjectRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  area: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: SubjectRow) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  area: row.area,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const subjectsRepository = {
  async create(schemaName: string, input: CreateSubjectInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `INSERT INTO "${schemaName}".subjects (code, name, description, area)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      input.code,
      input.name,
      input.description ?? null,
      input.area ?? null,
    );
    return toApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `SELECT * FROM "${schemaName}".subjects WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByCode(schemaName: string, code: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `SELECT * FROM "${schemaName}".subjects WHERE code = $1 LIMIT 1`,
      code,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListSubjectsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('is_active = true');
    if (query.active === 'false') conditions.push('is_active = false');

    if (query.area) {
      params.push(query.area);
      conditions.push(`area = $${params.length}`);
    }

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(name) LIKE $${params.length} OR LOWER(code) LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `SELECT * FROM "${schemaName}".subjects ${where} ORDER BY name ASC`,
      ...params,
    );
    return rows.map(toApi);
  },

  async update(schemaName: string, id: string, input: UpdateSubjectInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      code: 'code',
      name: 'name',
      description: 'description',
      area: 'area',
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

    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `UPDATE "${schemaName}".subjects SET ${fields.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `UPDATE "${schemaName}".subjects SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
    async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `UPDATE "${schemaName}".subjects
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Cuenta cuántos datos relacionados tiene una asignatura.
   * Se usa para decidir si se puede eliminar definitivamente.
   */
  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{ courses: bigint }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".courses WHERE subject_id = $1::uuid) AS courses
      `,
      id,
    );

    const r = rows[0];
    return {
      total: Number(r.courses),
      breakdown: {
        courses: Number(r.courses),
      },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SubjectRow[]>(
      `DELETE FROM "${schemaName}".subjects WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};