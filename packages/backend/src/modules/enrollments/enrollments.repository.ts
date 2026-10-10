import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateEnrollmentInput,
  ListEnrollmentsQuery,
  UpdateEnrollmentInput,
} from './enrollments.schemas';

type EnrollmentRow = {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: Date;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type EnrollmentDetailedRow = EnrollmentRow & {
  student_full_name: string;
  student_dni: string;
  student_email: string | null;
  course_academic_year_id: string;
  course_year: number;
  course_section_id: string;
  course_section_name: string;
  course_subject_id: string;
  course_subject_code: string;
  course_subject_name: string;
  course_teacher_id: string | null;
  course_teacher_full_name: string | null;
  course_grade_id: string;
  course_grade_code: string;
  course_grade_name: string;
  course_grade_level: string;
};

const toApi = (row: EnrollmentRow) => ({
  id: row.id,
  courseId: row.course_id,
  studentId: row.student_id,
  enrolledAt: row.enrolled_at,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toApiDetailed = (row: EnrollmentDetailedRow) => ({
  id: row.id,
  courseId: row.course_id,
  studentId: row.student_id,
  enrolledAt: row.enrolled_at,
  status: row.status,
  notes: row.notes,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  student: {
    id: row.student_id,
    fullName: row.student_full_name,
    dni: row.student_dni,
    email: row.student_email,
  },
  course: {
    id: row.course_id,
    academicYear: {
      id: row.course_academic_year_id,
      year: row.course_year,
    },
    section: {
      id: row.course_section_id,
      name: row.course_section_name,
      gradeLevel: {
        id: row.course_grade_id,
        code: row.course_grade_code,
        name: row.course_grade_name,
        level: row.course_grade_level,
      },
    },
    gradeLevel: {
      id: row.course_grade_id,
      code: row.course_grade_code,
      name: row.course_grade_name,
      level: row.course_grade_level,
    },
    subject: {
      id: row.course_subject_id,
      code: row.course_subject_code,
      name: row.course_subject_name,
    },
    teacher: row.course_teacher_id
      ? {
          id: row.course_teacher_id,
          fullName: row.course_teacher_full_name ?? '',
        }
      : null,
  },
});

const buildDetailedSelect = (schemaName: string) => `
  SELECT
    e.*,
    st.full_name AS student_full_name,
    st.dni AS student_dni,
    st.email AS student_email,
    c.academic_year_id AS course_academic_year_id,
    ay.year AS course_year,
    c.section_id AS course_section_id,
    s.name AS course_section_name,
    c.subject_id AS course_subject_id,
    sub.code AS course_subject_code,
    sub.name AS course_subject_name,
    c.teacher_id AS course_teacher_id,
    t.full_name AS course_teacher_full_name,
    gl.id AS course_grade_id,
    gl.code AS course_grade_code,
    gl.name AS course_grade_name,
    gl.level AS course_grade_level
  FROM "${schemaName}".enrollments e
  JOIN "${schemaName}".students st ON st.id = e.student_id
  JOIN "${schemaName}".courses c ON c.id = e.course_id
  JOIN "${schemaName}".academic_years ay ON ay.id = c.academic_year_id
  JOIN "${schemaName}".sections s ON s.id = c.section_id
  JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
  JOIN "${schemaName}".subjects sub ON sub.id = c.subject_id
  LEFT JOIN "${schemaName}".teachers t ON t.id = c.teacher_id
`;

export const enrollmentsRepository = {
  async create(schemaName: string, input: CreateEnrollmentInput) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EnrollmentRow[]>(
      `INSERT INTO "${schemaName}".enrollments (course_id, student_id, notes)
       VALUES ($1::uuid, $2::uuid, $3)
       RETURNING *`,
      input.courseId,
      input.studentId,
      input.notes ?? null,
    );
    return toApi(rows[0]);
  },

  async findDetailedById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EnrollmentDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} WHERE e.id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApiDetailed(rows[0]) : null;
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EnrollmentRow[]>(
      `SELECT * FROM "${schemaName}".enrollments WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findByCourseAndStudent(schemaName: string, courseId: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EnrollmentRow[]>(
      `SELECT * FROM "${schemaName}".enrollments
       WHERE course_id = $1::uuid AND student_id = $2::uuid LIMIT 1`,
      courseId,
      studentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListEnrollmentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.courseId) {
      params.push(query.courseId);
      conditions.push(`e.course_id = $${params.length}::uuid`);
    }
    if (query.studentId) {
      params.push(query.studentId);
      conditions.push(`e.student_id = $${params.length}::uuid`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`e.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await prisma.$queryRawUnsafe<EnrollmentDetailedRow[]>(
      `${buildDetailedSelect(schemaName)} ${where}
       ORDER BY st.full_name ASC`,
      ...params,
    );
    return rows.map(toApiDetailed);
  },

  async listByStudent(schemaName: string, studentId: string) {
    return this.list(schemaName, { studentId, status: 'active' });
  },

  async listByCourse(schemaName: string, courseId: string) {
    return this.list(schemaName, { courseId, status: 'active' });
  },

  async update(schemaName: string, id: string, input: UpdateEnrollmentInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, string> = {
      status: 'status',
      notes: 'notes',
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

    if (fields.length === 0) return this.findDetailedById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".enrollments SET ${fields.join(', ')} WHERE id = $${params.length}::uuid`,
      ...params,
    );

    return this.findDetailedById(schemaName, id);
  },

  async delete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<EnrollmentRow[]>(
      `DELETE FROM "${schemaName}".enrollments WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async countRelatedData(schemaName: string, enrollmentId: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        course_id: string;
        student_id: string;
        grade_entries: bigint;
        attendance_records: bigint;
      }>
    >(
      `SELECT
         e.course_id,
         e.student_id,
         (SELECT COUNT(*) FROM "${schemaName}".grade_entries ge
            JOIN "${schemaName}".evaluations ev ON ev.id = ge.evaluation_id
            JOIN "${schemaName}".grade_categories gc ON gc.id = ev.category_id
            WHERE gc.course_id = e.course_id AND ge.student_id = e.student_id) AS grade_entries,
         (SELECT COUNT(*) FROM "${schemaName}".attendance_records ar
            JOIN "${schemaName}".attendance_sessions ase ON ase.id = ar.session_id
            JOIN "${schemaName}".sections s ON s.id = ase.section_id
            JOIN "${schemaName}".courses c ON c.section_id = s.id
            WHERE c.id = e.course_id AND ar.student_id = e.student_id) AS attendance_records
       FROM "${schemaName}".enrollments e
       WHERE e.id = $1::uuid
       LIMIT 1`,
      enrollmentId,
    );

    if (!rows[0]) {
      return { total: 0, breakdown: { gradeEntries: 0, attendanceRecords: 0 } };
    }

    const r = rows[0];
    const total = Number(r.grade_entries) + Number(r.attendance_records);

    return {
      total,
      breakdown: {
        gradeEntries: Number(r.grade_entries),
        attendanceRecords: Number(r.attendance_records),
      },
    };
  },

  async autoEnrollStudentInSection(
    schemaName: string,
    studentId: string,
    sectionId: string,
  ) {
    assertSafeSchemaName(schemaName);

    const courses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".courses
        WHERE section_id = $1::uuid AND is_active = true`,
      sectionId,
    );

    if (courses.length === 0) {
      return { created: 0, skipped: 0, errors: 0 };
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const c of courses) {
      try {
        const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
          `SELECT id FROM "${schemaName}".enrollments
            WHERE course_id = $1::uuid AND student_id = $2::uuid
            LIMIT 1`,
          c.id,
          studentId,
        );

        if (existing[0]) {
          skipped++;
          continue;
        }

        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".enrollments (course_id, student_id)
           VALUES ($1::uuid, $2::uuid)`,
          c.id,
          studentId,
        );
        created++;
      } catch {
        errors++;
      }
    }

    return { created, skipped, errors };
  },

  async findEnrolledStudentIdsInSection(schemaName: string, sectionId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<Array<{ student_id: string }>>(
      `SELECT DISTINCT e.student_id
         FROM "${schemaName}".enrollments e
         JOIN "${schemaName}".courses c ON c.id = e.course_id
        WHERE c.section_id = $1::uuid AND e.status = 'active'`,
      sectionId,
    );
    return rows.map((r) => r.student_id);
  },
};