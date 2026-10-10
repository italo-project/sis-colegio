import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type { CloseYearInput, PreloadNextYearInput } from './close-year.schemas';

// ── Tipos internos ────────────────────────────────────────────
type CandidateRow = {
  student_id: string;
  full_name: string;
  dni: string;
  section_id: string | null;
  section_name: string | null;
  grade_level_id: string | null;
  grade_level_name: string | null;
  grade_level_code: string | null;
  grade_level_order: number | null;
  grade_level_level: string | null;
  final_average: string | null;
};

type AcademicYearRow = {
  id: string;
  year: number;
  start_date: Date;
  end_date: Date;
  is_active: boolean;
};

type SectionRow = {
  id: string;
  academic_year_id: string;
  grade_level_id: string;
  name: string;
  capacity: number | null;
};

type GradeLevelRow = {
  id: string;
  code: string;
  name: string;
  level: string;
  order_index: number;
};

/**
 * Calcula el promedio final del estudiante en TODOS los cursos de su sección.
 * Devuelve un único número (promedio de los promedios finales de cada curso
 * que tenga al menos una nota), o null si no hay notas.
 *
 * Reutiliza la misma lógica que usaba students.repository.computeAverageInSection,
 * pero sin exportarla porque aquí es interna.
 */
const computeAverageForStudent = async (
  schemaName: string,
  studentId: string,
  sectionId: string,
): Promise<number | null> => {
  assertSafeSchemaName(schemaName);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      course_id: string;
      category_id: string;
      category_weight: string;
      evaluation_weight: string;
      evaluation_max_score: string;
      score: string | null;
    }>
  >(
    `SELECT
       gc.course_id,
       gc.id AS category_id,
       gc.weight AS category_weight,
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

  // Agrupar por curso → categoría
  const byCourse = new Map<
    string,
    Map<
      string,
      {
        weight: number;
        entries: Array<{ score: number | null; weight: number; maxScore: number }>;
      }
    >
  >();

  for (const r of rows) {
    if (!byCourse.has(r.course_id)) byCourse.set(r.course_id, new Map());
    const byCat = byCourse.get(r.course_id)!;
    if (!byCat.has(r.category_id)) {
      byCat.set(r.category_id, { weight: Number(r.category_weight), entries: [] });
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

      categoryAverages.push({ weight: cat.weight, avg: weightedSum / totalWeightUsed });
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
};

/**
 * Devuelve el promedio final de todos los estudiantes activos
 * de la sección dada, agrupado por student_id → promedio.
 * Es más eficiente que llamar a computeAverageForStudent uno por uno.
 */
const computeAveragesBatch = async (
  schemaName: string,
  academicYearId: string,
): Promise<Map<string, number>> => {
  assertSafeSchemaName(schemaName);

  // Traer todas las notas de todos los cursos del año escolar
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      student_id: string;
      course_id: string;
      category_id: string;
      category_weight: string;
      evaluation_weight: string;
      evaluation_max_score: string;
      score: string | null;
    }>
  >(
    `SELECT
       ge.student_id,
       gc.course_id,
       gc.id AS category_id,
       gc.weight AS category_weight,
       e.weight AS evaluation_weight,
       e.max_score AS evaluation_max_score,
       ge.score
     FROM "${schemaName}".courses c
     JOIN "${schemaName}".grade_categories gc ON gc.course_id = c.id AND gc.is_active = true
     JOIN "${schemaName}".evaluations e ON e.category_id = gc.id AND e.is_active = true
     LEFT JOIN "${schemaName}".grade_entries ge ON ge.evaluation_id = e.id
     WHERE c.academic_year_id = $1::uuid AND c.is_active = true
       AND ge.student_id IS NOT NULL`,
    academicYearId,
  );

  // Agrupar: studentId → courseId → categoryId → entries
  type Cat = {
    weight: number;
    entries: Array<{ score: number | null; weight: number; maxScore: number }>;
  };
  type CourseMap = Map<string, Map<string, Cat>>;
  const byStudent = new Map<string, CourseMap>();

  for (const r of rows) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, new Map());
    const byCourse = byStudent.get(r.student_id)!;
    if (!byCourse.has(r.course_id)) byCourse.set(r.course_id, new Map());
    const byCat = byCourse.get(r.course_id)!;
    if (!byCat.has(r.category_id)) {
      byCat.set(r.category_id, { weight: Number(r.category_weight), entries: [] });
    }
    byCat.get(r.category_id)!.entries.push({
      score: r.score !== null ? Number(r.score) : null,
      weight: Number(r.evaluation_weight),
      maxScore: Number(r.evaluation_max_score),
    });
  }

  const result = new Map<string, number>();

  for (const [studentId, byCourse] of byStudent.entries()) {
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

        categoryAverages.push({ weight: cat.weight, avg: weightedSum / totalWeightUsed });
      }

      if (categoryAverages.length === 0) continue;
      const totalCatWeight = categoryAverages.reduce((s, c) => s + c.weight, 0);
      if (totalCatWeight === 0) continue;
      const finalAvg =
        categoryAverages.reduce((s, c) => s + c.weight * c.avg, 0) / totalCatWeight;

      courseAverages.push(finalAvg);
    }

    if (courseAverages.length === 0) continue;
    const overall = courseAverages.reduce((s, a) => s + a, 0) / courseAverages.length;
    result.set(studentId, Math.round(overall * 100) / 100);
  }

  return result;
};

export const closeYearRepository = {
  /**
   * Devuelve el año escolar por ID.
   */
  async getAcademicYear(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `SELECT * FROM "${schemaName}".academic_years WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ?? null;
  },

  /**
   * Lista los estudiantes activos con su sección actual + promedio del año.
   * Solo trae estudiantes con `section_id` asignado.
   */
  async listCandidates(schemaName: string, academicYearId: string) {
    assertSafeSchemaName(schemaName);

    const rows = await prisma.$queryRawUnsafe<CandidateRow[]>(
      `SELECT
         s.id AS student_id,
         s.full_name,
         s.dni,
         s.section_id,
         sec.name AS section_name,
         gl.id AS grade_level_id,
         gl.name AS grade_level_name,
         gl.code AS grade_level_code,
         gl.order_index AS grade_level_order,
         gl.level AS grade_level_level
       FROM "${schemaName}".students s
       JOIN "${schemaName}".sections sec ON sec.id = s.section_id
       JOIN "${schemaName}".grade_levels gl ON gl.id = sec.grade_level_id
       WHERE s.is_active = true
         AND sec.academic_year_id = $1::uuid
       ORDER BY gl.order_index ASC, sec.name ASC, s.full_name ASC`,
      academicYearId,
    );

    // Calcular promedios en batch
    const averages = await computeAveragesBatch(schemaName, academicYearId);

    return rows.map((r) => {
      const avg = averages.get(r.student_id) ?? null;
      // Sugerencia: si avg >= 11 → promoted, si avg < 11 → repeated, si null → repeated (sin notas)
      let suggestedStatus: 'promoted' | 'repeated' | 'graduated' = 'repeated';
      if (r.grade_level_order === 24 && avg !== null && avg >= 11) {
        // 5° Secundaria = order 24 → graduated
        suggestedStatus = 'graduated';
      } else if (avg !== null && avg >= 11) {
        suggestedStatus = 'promoted';
      }

      return {
        studentId: r.student_id,
        fullName: r.full_name,
        dni: r.dni,
        section: r.section_id
          ? {
              id: r.section_id,
              name: r.section_name,
              gradeLevel: {
                id: r.grade_level_id,
                name: r.grade_level_name,
                code: r.grade_level_code,
                level: r.grade_level_level,
                orderIndex: r.grade_level_order,
              },
            }
          : null,
        finalAverage: avg,
        suggestedStatus,
      };
    });
  },

  /**
   * Guarda las decisiones de cierre de año.
   * Requiere que el año escolar NO tenga aún registro de cierre.
   * Es idempotente: si un estudiante ya está cerrado, se salta.
   */
  async closeYear(
    schemaName: string,
    input: CloseYearInput,
    closedBy: string,
  ) {
    assertSafeSchemaName(schemaName);

    // 1. Verificar que el año existe
    const year = await this.getAcademicYear(schemaName, input.academicYearId);
    if (!year) {
      return { error: 'Año escolar no encontrado' };
    }

    // 2. Verificar que ningún estudiante esté ya cerrado para este año
    const alreadyClosed = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count
         FROM "${schemaName}".student_year_end_status
        WHERE academic_year_id = $1::uuid`,
      input.academicYearId,
    );
    if (Number(alreadyClosed[0].count) > 0) {
      return {
        error:
          'Este año escolar ya fue cerrado. Si necesitas corregir algo, contacta al soporte.',
      };
    }

    // 3. Insertar todas las decisiones
    const inserted: string[] = [];
    const errors: Array<{ studentId: string; error: string }> = [];

    for (const decision of input.decisions) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO "${schemaName}".student_year_end_status
             (student_id, academic_year_id, final_average, status, next_section_id, notes, closed_by)
           VALUES (
             $1::uuid, $2::uuid,
             (SELECT final_average FROM (
                SELECT COALESCE(
                  (SELECT AVG(ge.score / NULLIF(e.max_score,0) * 20)
                     FROM "${schemaName}".grade_entries ge
                     JOIN "${schemaName}".evaluations e ON e.id = ge.evaluation_id
                     JOIN "${schemaName}".grade_categories gc ON gc.id = e.category_id
                     JOIN "${schemaName}".courses c ON c.id = gc.course_id
                     JOIN "${schemaName}".sections sec ON sec.id = c.section_id
                    WHERE ge.student_id = $1::uuid
                      AND sec.academic_year_id = $2::uuid
                      AND ge.score IS NOT NULL
                  ), NULL
                ) AS final_average
             ) sub),
             $3, $4::uuid, $5, $6::uuid
           )
           ON CONFLICT (student_id, academic_year_id) DO NOTHING`,
          decision.studentId,
          input.academicYearId,
          decision.status,
          decision.nextSectionId ?? null,
          decision.notes ?? null,
          closedBy,
        );
        inserted.push(decision.studentId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push({ studentId: decision.studentId, error: msg });
      }
    }

    // 4. Desactivar el año escolar (marcar is_active = false)
    await prisma.$executeRawUnsafe(
      `UPDATE "${schemaName}".academic_years
          SET is_active = false, updated_at = now()
        WHERE id = $1::uuid`,
      input.academicYearId,
    );

    return {
      ok: true,
      totalDecisions: input.decisions.length,
      inserted: inserted.length,
      errors,
    };
  },

  /**
   * Lista el historial de cierres de un estudiante.
   */
  async getStudentYearEndHistory(schemaName: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        academic_year_id: string;
        year: number;
        final_average: string | null;
        status: string;
        next_section_id: string | null;
        next_section_name: string | null;
        notes: string | null;
        closed_at: Date;
      }>
    >(
      `SELECT
         syes.id,
         syes.academic_year_id,
         ay.year,
         syes.final_average,
         syes.status,
         syes.next_section_id,
         next_sec.name AS next_section_name,
         syes.notes,
         syes.closed_at
       FROM "${schemaName}".student_year_end_status syes
       JOIN "${schemaName}".academic_years ay ON ay.id = syes.academic_year_id
       LEFT JOIN "${schemaName}".sections next_sec ON next_sec.id = syes.next_section_id
       WHERE syes.student_id = $1::uuid
       ORDER BY ay.year DESC`,
      studentId,
    );

    return rows.map((r) => ({
      id: r.id,
      academicYearId: r.academic_year_id,
      year: r.year,
      finalAverage: r.final_average !== null ? Number(r.final_average) : null,
      status: r.status,
      nextSection: r.next_section_id
        ? { id: r.next_section_id, name: r.next_section_name }
        : null,
      notes: r.notes,
      closedAt: r.closed_at,
    }));
  },

  /**
   * Precarga el siguiente año escolar.
   * - Crea el nuevo `academic_years`.
   * - Copia las secciones del año anterior (mismo nombre, mismo grado).
   * - Devuelve el map "sección vieja → sección nueva" para que el frontend
   *   pueda asignar a los alumnos promovidos.
   */
  async preloadNextYear(
    schemaName: string,
    input: PreloadNextYearInput,
    createdBy: string,
  ) {
    assertSafeSchemaName(schemaName);

    // 1. Verificar que el año origen existe
    const sourceYear = await this.getAcademicYear(schemaName, input.fromAcademicYearId);
    if (!sourceYear) {
      return { error: 'Año escolar origen no encontrado' };
    }

    // 2. Verificar que no exista ya el nuevo año
    const existingYear = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${schemaName}".academic_years WHERE year = $1 LIMIT 1`,
      input.newYear,
    );
    if (existingYear[0]) {
      return { error: `Ya existe un año escolar con year = ${input.newYear}` };
    }

    // 3. Crear el nuevo año escolar
    const newYearRows = await prisma.$queryRawUnsafe<AcademicYearRow[]>(
      `INSERT INTO "${schemaName}".academic_years (year, start_date, end_date, is_active)
       VALUES ($1, $2::date, $3::date, false)
       RETURNING *`,
      input.newYear,
      input.newStartDate,
      input.newEndDate,
    );
    const newYear = newYearRows[0];

    // 4. Traer secciones del año origen
    const sourceSections = await prisma.$queryRawUnsafe<SectionRow[]>(
      `SELECT * FROM "${schemaName}".sections
        WHERE academic_year_id = $1::uuid
        ORDER BY name ASC`,
      input.fromAcademicYearId,
    );

    // 5. Crear copias de las secciones en el nuevo año
    const sectionMap: Array<{
      oldSectionId: string;
      newSectionId: string;
      sectionName: string;
      gradeLevelId: string;
    }> = [];

    for (const sec of sourceSections) {
      const newSectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        `INSERT INTO "${schemaName}".sections
           (academic_year_id, grade_level_id, name, capacity)
         VALUES ($1::uuid, $2::uuid, $3, $4)
         RETURNING id`,
        newYear.id,
        sec.grade_level_id,
        sec.name,
        sec.capacity ?? null,
      );
      sectionMap.push({
        oldSectionId: sec.id,
        newSectionId: newSectionRows[0].id,
        sectionName: sec.name,
        gradeLevelId: sec.grade_level_id,
      });
    }

    // 6. Traer grados para el map de "siguiente grado"
    const gradeLevels = await prisma.$queryRawUnsafe<GradeLevelRow[]>(
      `SELECT id, code, name, level, order_index
         FROM "${schemaName}".grade_levels
        WHERE is_active = true
        ORDER BY order_index ASC`,
    );

    // Map: order_index actual → siguiente grade_level_id
    const nextGradeMap = new Map<number, { id: string; name: string }>();
    for (let i = 0; i < gradeLevels.length - 1; i++) {
      nextGradeMap.set(gradeLevels[i].order_index, {
        id: gradeLevels[i + 1].id,
        name: gradeLevels[i + 1].name,
      });
    }

    // 7. Devolver todo lo necesario para que el frontend muestre la asignación
    return {
      ok: true,
      newAcademicYear: {
        id: newYear.id,
        year: newYear.year,
        startDate: newYear.start_date,
        endDate: newYear.end_date,
      },
      createdSections: sectionMap,
      gradeLevels,
      nextGradeMap: Object.fromEntries(nextGradeMap),
    };
  },

  /**
   * Guarda la sección destino de cada estudiante promovido.
   * Se llama después de la precarga del año nuevo.
   * Solo actualiza los que tienen `next_section_id = null` y status 'promoted'.
   */
  async assignNextSections(
    schemaName: string,
    academicYearId: string,
    assignments: Array<{ studentId: string; nextSectionId: string }>,
  ) {
    assertSafeSchemaName(schemaName);

    let updated = 0;
    const errors: Array<{ studentId: string; error: string }> = [];

    for (const a of assignments) {
      try {
        const result = await prisma.$executeRawUnsafe(
          `UPDATE "${schemaName}".student_year_end_status
              SET next_section_id = $1::uuid
            WHERE student_id = $2::uuid
              AND academic_year_id = $3::uuid
              AND status = 'promoted'`,
          a.nextSectionId,
          a.studentId,
          academicYearId,
        );
        if (result > 0) updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push({ studentId: a.studentId, error: msg });
      }
    }

    return { ok: true, updated, errors };
  },
};