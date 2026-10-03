import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CreateCourseInput, ListCoursesQuery, UpdateCourseInput } from './courses.schemas';

type CourseRow = {
  id: string;
  academic_year_id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string;
  weekly_hours: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type CourseDetailedRow = CourseRow & {
  year: number;
  section_name: string;
  grade_level_id: string;
  grade_code: string;
  grade_name: string;
  grade_level: string;
  subject_code: string;
  subject_name: string;
  subject_area: string | null;
  teacher_first_name: string;
  teacher_last_name: string;
  teacher_dni: string;
  teacher_email: string;
};

const toApi = (row: CourseRow) => ({
  id: row.id,
  academicYearId: row.academic_year_id,
  sectionId: row.section_id,
  subjectId: row.subject_id,
  teacherId: row.teacher_id,
  weeklyHours: row.weekly_hours,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toApiDetailed = (row: CourseDetailedRow) => ({
  id: row.id,
  academicYearId: row.academic_year_id,
  sectionId: row.section_id,
  subjectId: row.subject_id,
  teacherId: row.teacher_id,
  weeklyHours: row.weekly_hours,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  academicYear: {
    id: row.academic_year_id,
    year: row.year,
  },
  section: {
    id: row.section_id,
    name: row.section_name,
    gradeLevel: {
      id: row.grade_level_id,
      code: row.grade_code,
      name: row.grade_name,
      level: row.grade_level,
    },
  },
  subject: {
    id: row.subject_id,
    code: row.subject_code,
    name: row.subject_name,
    area: row.subject_area,
  },
  teacher: {
    id: row.teacher_id,
    firstName: row.teacher_first_name,
    lastName: row.teacher_last_name,
    dni: row.teacher_dni,
    email: row.teacher_email,
  },
});

/**
 * Genera el SELECT detallado con el esquema correcto inyectado.
 * IMPORTANTE: el nombre del esquema debe estar calificado en cada tabla
 * porque Prisma NO aplica search_path.
 */
const buildDetailedSelect = (schemaName: string) => `
  SELECT
    c.*,
    ay.year AS year,
    s.name AS section_name,
    gl.id AS grade_level_id,
    gl.code AS grade_code,
    gl.name AS grade_name,
    gl.level AS grade_level,
    sub.code AS subject_code,
    sub.name AS subject_name,
    sub.area AS subject_area,
    t.first_name AS teacher_first_name,
    t.last_name AS teacher_last_name,
    t.dni AS teacher_dni,
    t.email AS teacher_email
  FROM "${schemaName}".courses c
  JOIN "${schemaName}".academic_years ay ON ay.id = c.academic_year_id
  JOIN "${schemaName}".sections s ON s.id = c.section_id
  JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
  JOIN "${schemaName}".subjects sub ON sub.id = c.subject_id
  JOIN "${schemaName}".teachers t ON t.id = c.teacher_id
`;

export const coursesRepository = {
  async create(schemaName: string, input: CreateCourseInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `INSERT INTO "${schemaName}".courses
        (academic_year_id, section_id, subject_id, teacher_id, weekly_hours)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
       RETURNING *`,
      input.academicYearId,
      input.sectionId,
      input.subjectId,
      input.teacherId,
      input.weeklyHours ?? null,
    );
    return toApi(rows[0]);
  },

  async findDetailedById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} WHERE c.id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApiDetailed(rows[0]) : null;
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `SELECT * FROM "${schemaName}".courses WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByUniqueKey(
    schemaName: string,
    academicYearId: string,
    sectionId: string,
    subjectId: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `SELECT * FROM "${schemaName}".courses
       WHERE academic_year_id = $1::uuid AND section_id = $2::uuid AND subject_id = $3::uuid
       LIMIT 1`,
      academicYearId,
      sectionId,
      subjectId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListCoursesQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.yearId) {
      params.push(query.yearId);
      conditions.push(`c.academic_year_id = $${params.length}::uuid`);
    }
    if (query.sectionId) {
      params.push(query.sectionId);
      conditions.push(`c.section_id = $${params.length}::uuid`);
    }
    if (query.subjectId) {
      params.push(query.subjectId);
      conditions.push(`c.subject_id = $${params.length}::uuid`);
    }
    if (query.teacherId) {
      params.push(query.teacherId);
      conditions.push(`c.teacher_id = $${params.length}::uuid`);
    }
    if (query.active === 'true') conditions.push('c.is_active = true');
    if (query.active === 'false') conditions.push('c.is_active = false');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<CourseDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} ${where}
       ORDER BY ay.year DESC, gl.order_index ASC, s.name ASC, sub.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".courses c ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toApiDetailed),
      total: Number(countRows[0].count),
    };
  },

  async listByTeacher(schemaName: string, teacherId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseDetailedRow[]>(
      `${buildDetailedSelect(schemaName)}
       WHERE c.teacher_id = $1::uuid AND c.is_active = true
       ORDER BY ay.year DESC, gl.order_index ASC, s.name ASC`,
      teacherId,
    );
    return rows.map(toApiDetailed);
  },

  async update(schemaName: string, id: string, input: UpdateCourseInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      teacherId: 'teacher_id',
      weeklyHours: 'weekly_hours',
      isActive: 'is_active',
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        const cast = key === 'teacherId' ? '::uuid' : '';
        params.push(value);
        fields.push(`${column} = $${params.length}${cast}`);
      }
    }

    if (fields.length === 0) return this.findDetailedById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".courses SET ${fields.join(', ')} WHERE id = $${params.length}::uuid`,
      ...params,
    );

    return this.findDetailedById(schemaName, id);
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `UPDATE "${schemaName}".courses SET is_active = false, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `UPDATE "${schemaName}".courses
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  /**
   * Cuenta cuántos datos relacionados tiene un curso.
   * Se usa para decidir si se puede eliminar definitivamente.
   */
   async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        enrollments: bigint;
        grade_categories: bigint;
      }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".enrollments WHERE course_id = $1::uuid) AS enrollments,
         (SELECT COUNT(*) FROM "${schemaName}".grade_categories WHERE course_id = $1::uuid) AS grade_categories
      `,
      id,
    );

    const r = rows[0];
    const total = Number(r.enrollments) + Number(r.grade_categories);

    return {
      total,
      breakdown: {
        enrollments: Number(r.enrollments),
        gradeCategories: Number(r.grade_categories),
      },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<CourseRow[]>(
      `DELETE FROM "${schemaName}".courses WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

};