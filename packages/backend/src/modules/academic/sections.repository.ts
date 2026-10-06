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
      conditions.push(`s.academic_year_id = $${params.length}::uuid`);
    }
    if (query.gradeLevelId) {
      params.push(query.gradeLevelId);
      conditions.push(`s.grade_level_id = $${params.length}::uuid`);
    }
    if (query.active === 'true') conditions.push('s.is_active = true');
    if (query.active === 'false') conditions.push('s.is_active = false');

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<
      Array<
        SectionRow & {
          grade_level_name: string;
          grade_level_code: string;
          grade_level_level: string;
          academic_year_year: number;
        }
      >
    >(
      `SELECT
         s.*,
         gl.name AS grade_level_name,
         gl.code AS grade_level_code,
         gl.level AS grade_level_level,
         ay.year AS academic_year_year
       FROM "${schemaName}".sections s
       JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
       JOIN "${schemaName}".academic_years ay ON ay.id = s.academic_year_id
       ${where}
       ORDER BY ay.year DESC, gl.order_index ASC, s.name ASC`,
      ...params,
    );

    return rows.map((row) => ({
      ...toApi(row),
      gradeLevel: {
        id: row.grade_level_id,
        code: row.grade_level_code,
        name: row.grade_level_name,
        level: row.grade_level_level,
      },
      academicYear: {
        id: row.academic_year_id,
        year: row.academic_year_year,
      },
    }));
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
    /**
   * Detalle completo de una sección: grado, año, tutor y estadísticas.
   */
  async getDetail(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        capacity: number | null;
        tutor_user_id: string | null;
        tutor_full_name: string | null;
        tutor_email: string | null;
        grade_level_id: string;
        grade_level_name: string;
        grade_level_code: string;
        grade_level_level: string;
        academic_year_id: string;
        academic_year_year: number;
        students_count: bigint;
        courses_count: bigint;
        is_active: boolean;
        created_at: Date;
        updated_at: Date;
      }>
    >(
      `SELECT
         s.id,
         s.name,
         s.capacity,
         s.tutor_user_id,
         u.full_name AS tutor_full_name,
         u.email AS tutor_email,
         gl.id AS grade_level_id,
         gl.name AS grade_level_name,
         gl.code AS grade_level_code,
         gl.level AS grade_level_level,
         ay.id AS academic_year_id,
         ay.year AS academic_year_year,
         s.is_active,
         s.created_at,
         s.updated_at,
         (SELECT COUNT(DISTINCT e.student_id)::bigint
          FROM "${schemaName}".enrollments e
          JOIN "${schemaName}".courses c ON c.id = e.course_id
          WHERE c.section_id = s.id AND e.status = 'active') AS students_count,
         (SELECT COUNT(*)::bigint
          FROM "${schemaName}".courses c
          WHERE c.section_id = s.id AND c.is_active = true) AS courses_count
       FROM "${schemaName}".sections s
       JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
       JOIN "${schemaName}".academic_years ay ON ay.id = s.academic_year_id
       LEFT JOIN public.users u ON u.id = s.tutor_user_id
       WHERE s.id = $1::uuid
       LIMIT 1`,
      id,
    );

    if (!rows[0]) return null;
    const r = rows[0];

    return {
      id: r.id,
      name: r.name,
      capacity: r.capacity,
      isActive: r.is_active,
      tutorUserId: r.tutor_user_id,
      tutor: r.tutor_user_id
        ? { fullName: r.tutor_full_name, email: r.tutor_email }
        : null,
      gradeLevel: {
        id: r.grade_level_id,
        name: r.grade_level_name,
        code: r.grade_level_code,
        level: r.grade_level_level,
      },
      academicYear: {
        id: r.academic_year_id,
        year: r.academic_year_year,
      },
      studentsCount: Number(r.students_count),
      coursesCount: Number(r.courses_count),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  },

  /**
   * Alumnos de la sección (únicos).
   */
  async listStudents(schemaName: string, sectionId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        first_name: string;
        last_name: string;
        dni: string;
        email: string | null;
        phone: string | null;
        has_account: boolean;
        is_active: boolean;
      }>
    >(
      `SELECT DISTINCT
         s.id,
         s.first_name,
         s.last_name,
         s.dni,
         s.email,
         s.phone,
         (s.user_id IS NOT NULL) AS has_account,
         s.is_active
       FROM "${schemaName}".students s
       JOIN "${schemaName}".enrollments e ON e.student_id = s.id AND e.status = 'active'
       JOIN "${schemaName}".courses c ON c.id = e.course_id
       WHERE c.section_id = $1::uuid
       ORDER BY s.last_name ASC, s.first_name ASC`,
      sectionId,
    );
    return rows.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      dni: r.dni,
      email: r.email,
      phone: r.phone,
      hasAccount: r.has_account,
      isActive: r.is_active,
    }));
  },

  /**
   * Cursos de la sección con docente asignado.
   */
  async listCourses(schemaName: string, sectionId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        subject_id: string;
        subject_code: string;
        subject_name: string;
        subject_area: string | null;
        teacher_id: string;
        teacher_first_name: string;
        teacher_last_name: string;
        weekly_hours: number | null;
        is_active: boolean;
        students_count: bigint;
      }>
    >(
      `SELECT
         c.id,
         c.subject_id,
         sub.code AS subject_code,
         sub.name AS subject_name,
         sub.area AS subject_area,
         c.teacher_id,
         t.first_name AS teacher_first_name,
         t.last_name AS teacher_last_name,
         c.weekly_hours,
         c.is_active,
         (SELECT COUNT(*)::bigint FROM "${schemaName}".enrollments e
          WHERE e.course_id = c.id AND e.status = 'active') AS students_count
       FROM "${schemaName}".courses c
       JOIN "${schemaName}".subjects sub ON sub.id = c.subject_id
       JOIN "${schemaName}".teachers t ON t.id = c.teacher_id
       WHERE c.section_id = $1::uuid
       ORDER BY sub.name ASC`,
      sectionId,
    );
    return rows.map((r) => ({
      id: r.id,
      subjectId: r.subject_id,
      subject: {
        code: r.subject_code,
        name: r.subject_name,
        area: r.subject_area,
      },
      teacher: {
        id: r.teacher_id,
        firstName: r.teacher_first_name,
        lastName: r.teacher_last_name,
      },
      weeklyHours: r.weekly_hours,
      isActive: r.is_active,
      studentsCount: Number(r.students_count),
    }));
  },
};