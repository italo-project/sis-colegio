import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateSectionInput, ListSectionsQuery, UpdateSectionInput } from './academic.schemas';

type SectionRow = {
  id: string;
  academic_year_id: string;
  grade_level_id: string;
  name: string;
  capacity: number | null;
  tutor_user_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

const toApi = (row: SectionRow) => ({
  id: row.id,
  academicYearId: row.academic_year_id,
  gradeLevelId: row.grade_level_id,
  name: row.name,
  capacity: row.capacity,
  tutorUserId: row.tutor_user_id,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const sectionsRepository = {
  async list(schemaName: string, query: ListSectionsQuery) {
    assertSafeSchemaName(schemaName);

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.yearId) {
      params.push(query.yearId);
      conditions.push(`academic_year_id = $${params.length}::uuid`);
    }
    if (query.gradeLevelId) {
      params.push(query.gradeLevelId);
      conditions.push(`grade_level_id = $${params.length}::uuid`);
    }
    if (query.active === 'true') conditions.push('is_active = true');
    if (query.active === 'false') conditions.push('is_active = false');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `SELECT * FROM "${schemaName}".sections ${where} ORDER BY name ASC`,
      ...params,
    );
    return rows.map(toApi);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `SELECT * FROM "${schemaName}".sections WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async create(schemaName: string, input: CreateSectionInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `INSERT INTO "${schemaName}".sections (academic_year_id, grade_level_id, name, capacity)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       RETURNING *`,
      input.academicYearId,
      input.gradeLevelId,
      input.name,
      input.capacity ?? null,
    );
    return toApi(rows[0]);
  },

  async update(schemaName: string, id: string, input: UpdateSectionInput) {
    assertSafeSchemaName(schemaName);
    const fields: string[] = [];
    const params: unknown[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      fields.push(`name = $${params.length}`);
    }
    if (input.capacity !== undefined) {
      params.push(input.capacity);
      fields.push(`capacity = $${params.length}`);
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `UPDATE "${schemaName}".sections SET ${fields.join(', ')} WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `UPDATE "${schemaName}".sections SET is_active = false, updated_at = now() WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
    async assignTutor(schemaName: string, sectionId: string, tutorUserId: string | null) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `UPDATE "${schemaName}".sections
       SET tutor_user_id = $1::uuid, updated_at = now()
       WHERE id = $2::uuid
       RETURNING *`,
      tutorUserId,
      sectionId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
  async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `UPDATE "${schemaName}".sections
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Cuenta cuántos datos relacionados tiene una sección.
   */
  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        courses: bigint;
        enrollments: bigint;
      }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".courses WHERE section_id = $1::uuid) AS courses,
         (SELECT COUNT(*) FROM "${schemaName}".enrollments e
            JOIN "${schemaName}".courses c ON c.id = e.course_id
            WHERE c.section_id = $1::uuid) AS enrollments
      `,
      id,
    );

    const r = rows[0];
    const total = Number(r.courses) + Number(r.enrollments);

    return {
      total,
      breakdown: {
        courses: Number(r.courses),
        enrollments: Number(r.enrollments),
      },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SectionRow[]>(
      `DELETE FROM "${schemaName}".sections WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },
};