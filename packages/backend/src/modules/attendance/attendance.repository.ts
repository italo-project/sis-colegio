import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import type {
  CreateAttendanceSessionInput,
  ListAttendanceSessionsQuery,
  UpdateAttendanceSessionInput,
} from './attendance.schemas';

// ── Sesiones ────────────────────────────────────────────────
type SessionRow = {
  id: string;
  section_id: string;
  session_date: Date;
  topic: string | null;
  notes: string | null;
  taken_by: string;
  created_at: Date;
  updated_at: Date;
};

type SessionDetailedRow = SessionRow & {
  section_name: string;
  grade_level_id: string;
  grade_code: string;
  grade_name: string;
  grade_level: string;
  academic_year_id: string;
  academic_year: number;
};

/**
 * Formatea una fecha DATE de Postgres como string "YYYY-MM-DD".
 * Usa getUTC* para no desplazar la fecha por zona horaria.
 */
const formatDateOnly = (d: Date | string | null): string | null => {
  if (!d) return null;
  if (typeof d === 'string') return d.substring(0, 10);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toSessionApi = (row: SessionRow) => ({
  id: row.id,
  sectionId: row.section_id,
  sessionDate: formatDateOnly(row.session_date),
  topic: row.topic,
  notes: row.notes,
  takenBy: row.taken_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toSessionDetailedApi = (row: SessionDetailedRow) => ({
  ...toSessionApi(row),
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
  academicYear: {
    id: row.academic_year_id,
    year: row.academic_year,
  },
});

const buildSessionDetailedSelect = (schemaName: string) => `
  SELECT
    ase.*,
    s.name AS section_name,
    gl.id AS grade_level_id,
    gl.code AS grade_code,
    gl.name AS grade_name,
    gl.level AS grade_level,
    ay.id AS academic_year_id,
    ay.year AS academic_year
  FROM "${schemaName}".attendance_sessions ase
  JOIN "${schemaName}".sections s ON s.id = ase.section_id
  JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
  JOIN "${schemaName}".academic_years ay ON ay.id = s.academic_year_id
`;

export const attendanceSessionsRepository = {
  async create(
    schemaName: string,
    input: CreateAttendanceSessionInput,
    takenBy: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
      `INSERT INTO "${schemaName}".attendance_sessions
        (section_id, session_date, topic, notes, taken_by)
       VALUES ($1::uuid, $2::date, $3, $4, $5::uuid)
       RETURNING *`,
      input.sectionId,
      input.sessionDate,
      input.topic ?? null,
      input.notes ?? null,
      takenBy,
    );
    return toSessionApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
      `SELECT * FROM "${schemaName}".attendance_sessions WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toSessionApi(rows[0]) : null;
  },

  async findDetailedById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SessionDetailedRow[]>(
      `${buildSessionDetailedSelect(schemaName)} WHERE ase.id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toSessionDetailedApi(rows[0]) : null;
  },

  async findBySectionAndDate(schemaName: string, sectionId: string, sessionDate: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
      `SELECT * FROM "${schemaName}".attendance_sessions
       WHERE section_id = $1::uuid AND session_date = $2::date LIMIT 1`,
      sectionId,
      sessionDate,
    );
    return rows[0] ? toSessionApi(rows[0]) : null;
  },

  async list(schemaName: string, query: ListAttendanceSessionsQuery) {
    assertSafeSchemaName(schemaName);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.sectionId) {
      params.push(query.sectionId);
      conditions.push(`ase.section_id = $${params.length}::uuid`);
    }
    if (query.gradeLevelId) {
      params.push(query.gradeLevelId);
      conditions.push(`s.grade_level_id = $${params.length}::uuid`);
    }
    if (query.fromDate) {
      params.push(query.fromDate);
      conditions.push(`ase.session_date >= $${params.length}::date`);
    }
    if (query.toDate) {
      params.push(query.toDate);
      conditions.push(`ase.session_date <= $${params.length}::date`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(query.limit, query.offset);

    const rows = await prisma.$queryRawUnsafe<SessionDetailedRow[]>(
      `${buildSessionDetailedSelect(schemaName)} ${where}
       ORDER BY ase.session_date DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      ...params,
    );

    const countRows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint as count
       FROM "${schemaName}".attendance_sessions ase
       JOIN "${schemaName}".sections s ON s.id = ase.section_id
       ${where}`,
      ...params.slice(0, params.length - 2),
    );

    return {
      items: rows.map(toSessionDetailedApi),
      total: Number(countRows[0].count),
    };
  },

  async update(schemaName: string, id: string, input: UpdateAttendanceSessionInput) {
    assertSafeSchemaName(schemaName);

    const map: Record<string, { column: string; cast?: string }> = {
      sessionDate: { column: 'session_date', cast: '::date' },
      topic: { column: 'topic' },
      notes: { column: 'notes' },
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

    const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
      `UPDATE "${schemaName}".attendance_sessions SET ${fields.join(', ')}
       WHERE id = $${params.length}::uuid RETURNING *`,
      ...params,
    );
    return rows[0] ? toSessionApi(rows[0]) : null;
  },

  async delete(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<SessionRow[]>(
      `DELETE FROM "${schemaName}".attendance_sessions WHERE id = $1::uuid RETURNING *`,
      id,
    );
    return rows[0] ? toSessionApi(rows[0]) : null;
  },
};

// ── Registros ───────────────────────────────────────────────
type RecordRow = {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  notes: string | null;
  recorded_by: string;
  recorded_at: Date;
  created_at: Date;
  updated_at: Date;
};

type RecordDetailedRow = RecordRow & {
  student_first_name: string;
  student_last_name: string;
  student_dni: string;
};

const toRecordApi = (row: RecordRow) => ({
  id: row.id,
  sessionId: row.session_id,
  studentId: row.student_id,
  status: row.status,
  notes: row.notes,
  recordedBy: row.recorded_by,
  recordedAt: row.recorded_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toRecordDetailedApi = (row: RecordDetailedRow) => ({
  ...toRecordApi(row),
  student: {
    id: row.student_id,
    firstName: row.student_first_name,
    lastName: row.student_last_name,
    dni: row.student_dni,
  },
});

export const attendanceRecordsRepository = {
  async upsert(
    schemaName: string,
    sessionId: string,
    studentId: string,
    status: string,
    notes: string | undefined,
    recordedBy: string,
  ) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<RecordRow[]>(
      `INSERT INTO "${schemaName}".attendance_records
         (session_id, student_id, status, notes, recorded_by, recorded_at)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, now())
       ON CONFLICT (session_id, student_id) DO UPDATE SET
         status = EXCLUDED.status,
         notes = COALESCE(EXCLUDED.notes, "${schemaName}".attendance_records.notes),
         recorded_by = EXCLUDED.recorded_by,
         recorded_at = now(),
         updated_at = now()
       RETURNING *`,
      sessionId,
      studentId,
      status,
      notes ?? null,
      recordedBy,
    );
    return toRecordApi(rows[0]);
  },

  async findById(schemaName: string, id: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<RecordRow[]>(
      `SELECT * FROM "${schemaName}".attendance_records WHERE id = $1::uuid LIMIT 1`,
      id,
    );
    return rows[0] ? toRecordApi(rows[0]) : null;
  },

  async findBySessionAndStudent(schemaName: string, sessionId: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<RecordRow[]>(
      `SELECT * FROM "${schemaName}".attendance_records
       WHERE session_id = $1::uuid AND student_id = $2::uuid LIMIT 1`,
      sessionId,
      studentId,
    );
    return rows[0] ? toRecordApi(rows[0]) : null;
  },

  async listBySession(schemaName: string, sessionId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<RecordDetailedRow[]>(
      `SELECT
         ar.*,
         s.first_name AS student_first_name,
         s.last_name AS student_last_name,
         s.dni AS student_dni
       FROM "${schemaName}".attendance_records ar
       JOIN "${schemaName}".students s ON s.id = ar.student_id
       WHERE ar.session_id = $1::uuid
       ORDER BY s.last_name ASC, s.first_name ASC`,
      sessionId,
    );
    return rows.map(toRecordDetailedApi);
  },

  async delete(schemaName: string, sessionId: string, studentId: string) {
    assertSafeSchemaName(schemaName);
    const rows = await prisma.$queryRawUnsafe<RecordRow[]>(
      `DELETE FROM "${schemaName}".attendance_records
       WHERE session_id = $1::uuid AND student_id = $2::uuid RETURNING *`,
      sessionId,
      studentId,
    );
    return rows[0] ? toRecordApi(rows[0]) : null;
  },

  /**
   * Historial de asistencia de un estudiante.
   * Si se pasa sectionId, filtra por esa sección.
   */
  async historyByStudent(schemaName: string, studentId: string, sectionId?: string) {
    assertSafeSchemaName(schemaName);
    const params: unknown[] = [studentId];
    let sectionFilter = '';
    if (sectionId) {
      params.push(sectionId);
      sectionFilter = `AND ase.section_id = $${params.length}::uuid`;
    }

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        session_id: string;
        session_date: Date;
        topic: string | null;
        section_id: string;
        section_name: string;
        grade_code: string;
        grade_name: string;
        record_id: string | null;
        status: string | null;
        notes: string | null;
        recorded_at: Date | null;
      }>
    >(
      `SELECT
         ase.id AS session_id,
         ase.session_date,
         ase.topic,
         ase.section_id,
         s.name AS section_name,
         gl.code AS grade_code,
         gl.name AS grade_name,
         ar.id AS record_id,
         ar.status,
         ar.notes,
         ar.recorded_at
       FROM "${schemaName}".attendance_sessions ase
       JOIN "${schemaName}".sections s ON s.id = ase.section_id
       JOIN "${schemaName}".grade_levels gl ON gl.id = s.grade_level_id
       LEFT JOIN "${schemaName}".attendance_records ar
         ON ar.session_id = ase.id AND ar.student_id = $1::uuid
       WHERE 1=1 ${sectionFilter}
       ORDER BY ase.session_date DESC`,
      ...params,
    );

    return rows.map((r) => ({
      sessionId: r.session_id,
      sessionDate: formatDateOnly(r.session_date),
      topic: r.topic,
      section: {
        id: r.section_id,
        name: r.section_name,
        gradeLevel: { code: r.grade_code, name: r.grade_name },
      },
      record: r.record_id
        ? {
            id: r.record_id,
            status: r.status,
            notes: r.notes,
            recordedAt: r.recorded_at,
          }
        : null,
    }));
  },
};