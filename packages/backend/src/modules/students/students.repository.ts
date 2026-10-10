import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateStudentInput,
  ListStudentsQuery,
  UpdateStudentInput,
  BulkCreateStudentInput,
} from './students.schemas';

type StudentRow = {
  id: string;
  user_id: string | null;
  full_name: string;
  dni: string;
  birth_date: Date | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  section_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

type GuardianInfo = {
  id: string;
  fullName: string;
  dni: string;
  relationship: string;
  isPrimary: boolean;
};

const toApi = (row: StudentRow, guardian: GuardianInfo | null = null) => ({
  id: row.id,
  userId: row.user_id,
  hasAccount: row.user_id !== null,
  fullName: row.full_name,
  dni: row.dni,
  birthDate: row.birth_date,
  gender: row.gender,
  email: row.email,
  phone: row.phone,
  address: row.address,
  sectionId: row.section_id,
  isActive: row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  guardian,
});

async function getPrimaryGuardian(
  schemaName: string,
  studentId: string,
): Promise<GuardianInfo | null> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      parent_id: string;
      relationship: string;
      is_primary: boolean;
      full_name: string;
      dni: string;
    }>
  >(
    `SELECT sp.parent_id, sp.relationship, sp.is_primary,
            p.full_name, p.dni
       FROM "${schemaName}".student_parents sp
       JOIN "${schemaName}".parents p ON p.id = sp.parent_id
      WHERE sp.student_id = $1::uuid
      ORDER BY sp.is_primary DESC
      LIMIT 1`,
    studentId,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.parent_id,
    fullName: r.full_name,
    dni: r.dni,
    relationship: r.relationship,
    isPrimary: r.is_primary,
  };
}

/**
 * Calcula el promedio final de un estudiante en TODOS los cursos
 * de una sección dada. Devuelve un único número (promedio de los
 * promedios finales de cada curso que tenga al menos una nota),
 * o null si no hay notas.
 */
async function computeAverageInSection(
  schemaName: string,
  studentId: string,
  sectionId: string,
): Promise<number | null> {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      course_id: string;
      category_id: string;
      category_name: string;
      category_weight: string;
      evaluation_id: string;
      evaluation_name: string;
      evaluation_weight: string;
      evaluation_max_score: string;
      score: string | null;
    }>
  >(
    `SELECT
       gc.course_id,
       gc.id AS category_id,
       gc.name AS category_name,
       gc.weight AS category_weight,
       e.id AS evaluation_id,
       e.name AS evaluation_name,
       e.weight AS evaluation_weight,
       e.max_score AS evaluation_max_score,
       ge.score
     FROM "${schemaName}".courses c
     JOIN "${schemaName}".grade_categories gc ON gc.course_id = c.id AND gc.is_active = true
     JOIN "${schemaName}".evaluations e ON e.category_id = gc.id AND e.is_active = true
     LEFT JOIN "${schemaName}".grade_entries ge
       ON ge.evaluation_id = e.id AND ge.student_id = $1::uuid
     WHERE c.section_id = $2::uuid AND c.is_active = true`,
    studentId,
    sectionId,
  );

  if (rows.length === 0) return null;

  const byCourse = new Map<
    string,
    Map<
      string,
      {
        name: string;
        weight: number;
        entries: Array<{
          score: number | null;
          weight: number;
          maxScore: number;
        }>;
      }
    >
  >();

  for (const r of rows) {
    if (!byCourse.has(r.course_id)) byCourse.set(r.course_id, new Map());
    const byCat = byCourse.get(r.course_id)!;
    if (!byCat.has(r.category_id)) {
      byCat.set(r.category_id, {
        name: r.category_name,
        weight: Number(r.category_weight),
        entries: [],
      });
    }
    byCat.get(r.category_id)!.entries.push({
      score: r.score !== null ? Number(r.score) : null,
      weight: Number(r.evaluation_weight),
      maxScore: Number(r.evaluation_max_score),
    });
  }

  const courseAverages: number[] = [];

  for (const byCat of byCourse.values()) {
    const categoryAverages: Array<{ weight: number; avg: number }> = [];

    for (const cat of byCat.values()) {
      const graded = cat.entries.filter((e) => e.score !== null);
      const totalWeightUsed = graded.reduce((s, e) => s + e.weight, 0);
      if (graded.length === 0 || totalWeightUsed === 0) continue;

      const weightedSum = graded.reduce((s, e) => {
        const normalized = ((e.score as number) / e.maxScore) * 20;
        return s + e.weight * normalized;
      }, 0);

      const avg = weightedSum / totalWeightUsed;
      categoryAverages.push({ weight: cat.weight, avg });
    }

    if (categoryAverages.length === 0) continue;

    const totalCatWeight = categoryAverages.reduce((s, c) => s + c.weight, 0);
    if (totalCatWeight === 0) continue;

    const finalAvg =
      categoryAverages.reduce((s, c) => s + c.weight * c.avg, 0) / totalCatWeight;

    courseAverages.push(finalAvg);
  }

  if (courseAverages.length === 0) return null;

  const overall = courseAverages.reduce((s, a) => s + a, 0) / courseAverages.length;
  return Math.round(overall * 100) / 100;
}

export const studentsRepository = {
  async create(schemaName: string, input: CreateStudentInput) {
    assertSafeSchemaName(schemaName);

    const parentRows = await prisma.$queryRawUnsafe<Array<{ id: string; is_active: boolean }>>(
      `SELECT id, is_active FROM "${schemaName}".parents WHERE id = $1::uuid LIMIT 1`,
      input.guardianId,
    );
    if (!parentRows[0]) {
      throw new Error('Apoderado no encontrado');
    }
    if (!parentRows[0].is_active) {
      throw new Error('El apoderado seleccionado está inactivo');
    }

    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `INSERT INTO "${schemaName}".students
        (full_name, dni, birth_date, gender, email, phone, address, section_id)
       VALUES ($1, $2, $3::date, $4, $5, $6, $7, $8::uuid)
       RETURNING *`,
      input.fullName,
      input.dni,
      input.birthDate || null,
      input.gender ?? null,
      input.email,
      input.phone || null,
      input.address || null,
      input.sectionId,
    );
    const student = rows[0];

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".student_parents
         (student_id, parent_id, relationship, is_primary)
       VALUES ($1::uuid, $2::uuid, 'apoderado', true)
       ON CONFLICT (student_id, parent_id)
       DO UPDATE SET is_primary = true`,
      student.id,
      input.guardianId,
    );

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".student_section_history
         (student_id, section_id, academic_year_id, enrolled_at)
       SELECT $1::uuid, $2::uuid, s.academic_year_id, now()
         FROM "${schemaName}".sections s
        WHERE s.id = $2::uuid`,
      student.id,
      input.sectionId,
    );

    const guardian = await getPrimaryGuardian(schemaName, student.id);
    return toApi(student, guardian);
  },

  async bulkCreate(schemaName: string, input: BulkCreateStudentInput) {
    assertSafeSchemaName(schemaName);

    const dniSet = new Set<string>();
    const internalDupes: Array<{ row: number; field: string; value: string }> = [];
    input.students.forEach((s, idx) => {
      const dni = s.dni.trim();
      if (dniSet.has(dni)) {
        internalDupes.push({ row: idx + 1, field: 'dni', value: dni });
      } else {
        dniSet.add(dni);
      }
    });
    if (internalDupes.length > 0) {
      return {
        error: 'Hay duplicados de DNI dentro del formulario',
        duplicates: internalDupes,
      };
    }

    const existingStudents = await prisma.$queryRawUnsafe<Array<{ dni: string }>>(
      `SELECT dni FROM "${schemaName}".students WHERE dni = ANY($1::varchar[])`,
      [...dniSet],
    );
    const existingDnis = new Set(existingStudents.map((s) => s.dni));

    const sectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".sections WHERE id = $1::uuid AND is_active = true LIMIT 1`,
      input.sectionId,
    );
    if (!sectionRows[0]) {
      return { error: 'La sección seleccionada no existe o está inactiva' };
    }

    const guardianIds = [...new Set(input.students.map((s) => s.guardianId))];
    const validParents = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".parents
        WHERE id = ANY($1::uuid[]) AND is_active = true`,
      guardianIds,
    );
    const validParentIds = new Set(validParents.map((p) => p.id));

    const conflicts: Array<{ row: number; field: string; value: string; reason: string }> = [];
    input.students.forEach((s, idx) => {
      const dni = s.dni.trim();
      if (existingDnis.has(dni)) {
        conflicts.push({
          row: idx + 1,
          field: 'dni',
          value: dni,
          reason: 'DNI ya registrado en este colegio',
        });
      }
      if (!validParentIds.has(s.guardianId)) {
        conflicts.push({
          row: idx + 1,
          field: 'guardianId',
          value: s.guardianId,
          reason: 'Apoderado no encontrado o inactivo',
        });
      }
    });

    if (conflicts.length > 0) {
      return {
        error: 'Hay conflictos con datos ya existentes',
        conflicts,
      };
    }

    const results: Array<{
      row: number;
      dni: string;
      fullName: string;
      ok: boolean;
      error?: string;
      studentId?: string;
    }> = [];

    for (let i = 0; i < input.students.length; i++) {
      const s = input.students[i];
      try {
        const created = await this.create(schemaName, {
          fullName: s.fullName.trim(),
          dni: s.dni.trim(),
          birthDate: s.birthDate || null,
          gender: s.gender ?? null,
          email: s.email.trim().toLowerCase(),
          phone: s.phone || null,
          address: s.address || null,
          sectionId: input.sectionId,
          guardianId: s.guardianId,
        });
        results.push({
          row: i + 1,
          dni: s.dni,
          fullName: s.fullName,
          ok: true,
          studentId: created.id,
        });
      } catch (err) {
        results.push({
          row: i + 1,
          dni: s.dni,
          fullName: s.fullName,
          ok: false,
          error: err instanceof Error ? err.message : 'Error desconocido',
        });
      }
    }

    return {
      created: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    if (!rows[0]) return null;
    const guardian = await getPrimaryGuardian(schemaName, rows[0].id);
    return toApi(rows[0], guardian);
  },

  async findByUserId(schemaName: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE user_id = $1::uuid LIMIT 1`,
      userId,
    );
    if (!rows[0]) return null;
    const guardian = await getPrimaryGuardian(schemaName, rows[0].id);
    return toApi(rows[0], guardian);
  },

  async findByDni(schemaName: string, dni: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `SELECT * FROM "${schemaName}".students WHERE dni = $1 LIMIT 1`,
      dni,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListStudentsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.active === 'true') conditions.push('s.is_active = true');
    if (query.active === 'false') conditions.push('s.is_active = false');

    if (query.sectionId) {
      params.push(query.sectionId);
      conditions.push(`s.section_id = $${params.length}::uuid`);
    }

    if (query.q) {
      params.push(`%${query.q.toLowerCase()}%`);
      conditions.push(
        `(LOWER(s.full_name) LIKE $${params.length} OR s.dni LIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countParams = [...params];

    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<
      Array<
        StudentRow & {
          section_name: string | null;
          grade_level_name: string | null;
          grade_level_code: string | null;
          academic_year: number | null;
          guardian_id: string | null;
          guardian_full_name: string | null;
          guardian_dni: string | null;
          guardian_relationship: string | null;
          guardian_is_primary: boolean | null;
        }
      >
    >(
      `SELECT
         s.*,
         sec.name AS section_name,
         gl.name AS grade_level_name,
         gl.code AS grade_level_code,
         ay.year AS academic_year,
         g.parent_id AS guardian_id,
         g.full_name AS guardian_full_name,
         g.dni AS guardian_dni,
         g.relationship AS guardian_relationship,
         g.is_primary AS guardian_is_primary
       FROM "${schemaName}".students s
       LEFT JOIN "${schemaName}".sections sec ON sec.id = s.section_id
       LEFT JOIN "${schemaName}".grade_levels gl ON gl.id = sec.grade_level_id
       LEFT JOIN "${schemaName}".academic_years ay ON ay.id = sec.academic_year_id
       LEFT JOIN LATERAL (
         SELECT sp.parent_id, p.full_name, p.dni, sp.relationship, sp.is_primary
         FROM "${schemaName}".student_parents sp
         JOIN "${schemaName}".parents p ON p.id = sp.parent_id
         WHERE sp.student_id = s.id
         ORDER BY sp.is_primary DESC, sp.created_at ASC
         LIMIT 1
       ) g ON true
       ${where}
       ORDER BY s.full_name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".students s ${where}`,
      ...countParams,
    );

    return {
      items: rows.map((r) => ({
        ...toApi(
          r,
          r.guardian_id
            ? {
                id: r.guardian_id,
                fullName: r.guardian_full_name ?? '',
                dni: r.guardian_dni ?? '',
                relationship: r.guardian_relationship ?? '',
                isPrimary: r.guardian_is_primary ?? false,
              }
            : null,
        ),
        section: r.section_name
          ? {
              id: r.section_id!,
              name: r.section_name,
              gradeLevel: {
                name: r.grade_level_name ?? '',
                code: r.grade_level_code ?? '',
              },
              academicYear: {
                year: r.academic_year ?? 0,
              },
            }
          : null,
      })),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateStudentInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      fullName: { column: 'full_name' },
      birthDate: { column: 'birth_date', cast: '::date' },
      gender: { column: 'gender' },
      email: { column: 'email' },
      phone: { column: 'phone' },
      address: { column: 'address' },
      sectionId: { column: 'section_id', cast: '::uuid' },
    };

    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, config] of Object.entries(map)) {
      const value = (input as Record<string, unknown>)[key];
      if (value !== undefined) {
        params.push(value === '' ? null : value);
        fields.push(`${config.column} = $${params.length}${config.cast ?? ''}`);
      }
    }

    if (fields.length === 0) return this.findById(schemaName, id);

    fields.push('updated_at = now()');
    params.push(id);

    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid
       RETURNING *`,
      ...params,
    );

    if (!rows[0]) return null;
    const guardian = await getPrimaryGuardian(schemaName, rows[0].id);
    return toApi(rows[0], guardian);
  },

  async linkUser(schemaName: string, studentId: string, userId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET user_id = $1::uuid, updated_at = now()
       WHERE id = $2::uuid
       RETURNING *`,
      userId,
      studentId,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async deactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET is_active = false, updated_at = now()
       WHERE id = $1::uuid
       RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async reactivate(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `UPDATE "${schemaName}".students
       SET is_active = true, updated_at = now()
       WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async countRelatedData(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        enrollments: bigint;
        invoices: bigint;
        payments: bigint;
        attendance: bigint;
        grade_entries: bigint;
        parents: bigint;
      }>
    >(
      `SELECT
         (SELECT COUNT(*) FROM "${schemaName}".enrollments WHERE student_id = $1::uuid) AS enrollments,
         (SELECT COUNT(*) FROM "${schemaName}".invoices WHERE student_id = $1::uuid) AS invoices,
         (SELECT COUNT(*) FROM "${schemaName}".payments p
            JOIN "${schemaName}".invoices i ON i.id = p.invoice_id
            WHERE i.student_id = $1::uuid) AS payments,
         (SELECT COUNT(*) FROM "${schemaName}".attendance_records WHERE student_id = $1::uuid) AS attendance,
         (SELECT COUNT(*) FROM "${schemaName}".grade_entries WHERE student_id = $1::uuid) AS grade_entries,
         (SELECT COUNT(*) FROM "${schemaName}".student_parents WHERE student_id = $1::uuid) AS parents
      `,
      id,
    );

    const r = rows[0];
    const total =
      Number(r.enrollments) +
      Number(r.invoices) +
      Number(r.payments) +
      Number(r.attendance) +
      Number(r.grade_entries) +
      Number(r.parents);

    return {
      total,
      breakdown: {
        enrollments: Number(r.enrollments),
        invoices: Number(r.invoices),
        payments: Number(r.payments),
        attendance: Number(r.attendance),
        gradeEntries: Number(r.grade_entries),
        parents: Number(r.parents),
      },
    };
  },

  async hardDelete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<StudentRow[]>(
      `DELETE FROM "${schemaName}".students WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toApi(rows[0]) : null;
  },

  async findGlobalUserByEmail(email: string): Promise<{ id: string } | null> {
    const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
      email.toLowerCase().trim(),
    );
    return rows[0] ?? null;
  },

  async changeSection(
    schemaName: string,
    studentId: string,
    newSectionId: string,
    reason?: string,
  ) {
    assertSafeSchemaName(schemaName);

    const studentRows = await prisma.$queryRawUnsafe<
      Array<{ id: string; section_id: string | null }>
    >(
      `SELECT id, section_id FROM "${schemaName}".students WHERE id = $1::uuid LIMIT 1`,
      studentId,
    );
    if (!studentRows[0]) {
      return { error: 'Estudiante no encontrado' };
    }
    const currentSectionId = studentRows[0].section_id;

    const newSectionRows = await prisma.$queryRawUnsafe<
      Array<{ id: string; academic_year_id: string; is_active: boolean }>
    >(
      `SELECT id, academic_year_id, is_active FROM "${schemaName}".sections WHERE id = $1::uuid LIMIT 1`,
      newSectionId,
    );
    if (!newSectionRows[0]) {
      return { error: 'La sección de destino no existe' };
    }
    if (!newSectionRows[0].is_active) {
      return { error: 'La sección de destino está inactiva' };
    }

    if (currentSectionId === newSectionId) {
      return { error: 'El estudiante ya está en esa sección' };
    }

    const newCoursesCount = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count FROM "${schemaName}".courses
        WHERE section_id = $1::uuid AND is_active = true`,
      newSectionId,
    );
    if (Number(newCoursesCount[0].count) === 0) {
      return {
        error: 'La sección de destino no tiene cursos activos. Genéralos primero.',
      };
    }

    let averageAtExit: number | null = null;
    if (currentSectionId) {
      averageAtExit = await computeAverageInSection(
        schemaName,
        studentId,
        currentSectionId,
      );
    }

    if (currentSectionId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "${schemaName}".student_section_history
            SET left_at = now(),
                average_at_exit = $1,
                reason = COALESCE($2, reason)
          WHERE student_id = $3::uuid
            AND section_id = $4::uuid
            AND left_at IS NULL`,
        averageAtExit,
        reason ?? null,
        studentId,
        currentSectionId,
      );
    }

    if (currentSectionId) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${schemaName}".enrollments
          WHERE student_id = $1::uuid
            AND course_id IN (
              SELECT id FROM "${schemaName}".courses
               WHERE section_id = $2::uuid
            )`,
        studentId,
        currentSectionId,
      );
    }

    const newCourses = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".courses
        WHERE section_id = $1::uuid AND is_active = true`,
      newSectionId,
    );

    let enrollmentsCreated = 0;
    for (const c of newCourses) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO "${schemaName}".enrollments (course_id, student_id)
         VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (course_id, student_id) DO NOTHING`,
        c.id,
        studentId,
      );
      enrollmentsCreated++;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".student_section_history
         (student_id, section_id, academic_year_id, enrolled_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, now())`,
      studentId,
      newSectionId,
      newSectionRows[0].academic_year_id,
    );

    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".students
          SET section_id = $1::uuid, updated_at = now()
        WHERE id = $2::uuid`,
      newSectionId,
      studentId,
    );

    return {
      ok: true,
      previousSectionId: currentSectionId,
      newSectionId,
      averageAtExit,
      enrollmentsCreated,
    };
  },

  async getSectionHistory(schemaName: string, studentId: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        section_id: string;
        section_name: string;
        grade_level_name: string;
        grade_level_code: string;
        grade_level_level: string;
        academic_year_id: string;
        academic_year: number;
        enrolled_at: Date;
        left_at: Date | null;
        average_at_exit: string | null;
        reason: string | null;
      }>
    >(
      `SELECT
         ssh.id,
         ssh.section_id,
         s.name AS section_name,
         gl.name AS grade_level_name,
         gl.code AS grade_level_code,
         gl.level AS grade_level_level,
         ssh.academic_year_id,
         ay.year AS academic_year,
         ssh.enrolled_at,
         ssh.left_at,
         ssh.average_at_exit,
         ssh.reason
       FROM "${schemaName}".student_section_history ssh
       JOIN "${schemaName}".sections s ON s.id = ssh.section_id
       JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
       JOIN "${schemaName}".academic_years ay ON ay.id = ssh.academic_year_id
       WHERE ssh.student_id = $1::uuid
       ORDER BY ssh.enrolled_at DESC`,
      studentId,
    );

    return rows.map((r) => ({
      id: r.id,
      sectionId: r.section_id,
      sectionName: r.section_name,
      gradeLevel: {
        name: r.grade_level_name,
        code: r.grade_level_code,
        level: r.grade_level_level,
      },
      academicYear: {
        id: r.academic_year_id,
        year: r.academic_year,
      },
      enrolledAt: r.enrolled_at,
      leftAt: r.left_at,
      averageAtExit:
        r.average_at_exit !== null ? Number(r.average_at_exit) : null,
      reason: r.reason,
      isCurrent: r.left_at === null,
    }));
  },
};