import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { studentsRepository } from '../students/students.repository';
import { enrollmentsRepository } from '../enrollments/enrollments.repository';
import {
  attendanceRecordsRepository,
  attendanceSessionsRepository,
} from './attendance.repository';
import { canManageSection } from './attendance.helpers';
import { prisma } from '../../config/prisma';
import {
  bulkAttendanceRecordsSchema,
  createAttendanceSessionSchema,
  listAttendanceSessionsQuerySchema,
  updateAttendanceSessionSchema,
  upsertAttendanceRecordSchema,
} from './attendance.schemas';

/**
 * Devuelve los estudiantes matriculados en cualquier curso de la sección dada
 * (matrícula activa). Un estudiante aparece una sola vez aunque esté en varios
 * cursos de la misma sección.
 */
const getStudentsOfSection = async (schemaName: string, sectionId: string) => {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      student_id: string;
      first_name: string;
      last_name: string;
      dni: string;
    }>
  >(
    `SELECT DISTINCT
       s.id AS student_id,
       s.first_name,
       s.last_name,
       s.dni
     FROM "${schemaName}".students s
     JOIN "${schemaName}".enrollments e ON e.student_id = s.id AND e.status = 'active'
     JOIN "${schemaName}".courses c ON c.id = e.course_id
     WHERE c.section_id = $1::uuid AND s.is_active = true
     ORDER BY s.last_name ASC, s.first_name ASC`,
    sectionId,
  );
  return rows.map((r) => ({
    id: r.student_id,
    firstName: r.first_name,
    lastName: r.last_name,
    dni: r.dni,
  }));
};

export const attendanceController = {
  // ── Sesiones ───────────────────────────────────────────────

  /**
   * POST /api/attendance/sessions
   */
  async createSession(req: Request, res: Response) {
    const parsed = createAttendanceSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const access = await canManageSection(req, parsed.data.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    // Validar que la sección existe
    const sectionRows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `SELECT id FROM "${req.tenant!.schemaName}".sections WHERE id = $1::uuid LIMIT 1`,
      parsed.data.sectionId,
    );
    if (!sectionRows[0]) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }

    const existing = await attendanceSessionsRepository.findBySectionAndDate(
      req.tenant!.schemaName,
      parsed.data.sectionId,
      parsed.data.sessionDate,
    );
    if (existing) {
      return res.status(409).json({
        error: 'Ya existe una sesión de asistencia para esa sección y fecha',
      });
    }

    const session = await attendanceSessionsRepository.create(
      req.tenant!.schemaName,
      parsed.data,
      req.user!.userId,
    );
    const detailed = await attendanceSessionsRepository.findDetailedById(
      req.tenant!.schemaName,
      session.id,
    );
    res.status(201).json(detailed);
  },

  /**
   * GET /api/attendance/sessions
   */
  async listSessions(req: Request, res: Response) {
    const parsed = listAttendanceSessionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Parámetros inválidos', details: parsed.error.flatten() });
    }
    const result = await attendanceSessionsRepository.list(
      req.tenant!.schemaName,
      parsed.data,
    );
    res.json(result);
  },

  /**
   * GET /api/attendance/sessions/:id
   * Devuelve la sesión con TODOS los estudiantes matriculados en la sección
   * y su estado (o null si no tienen registro).
   */
  async getSession(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const session = await attendanceSessionsRepository.findDetailedById(
      req.tenant!.schemaName,
      id,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const students = await getStudentsOfSection(req.tenant!.schemaName, session.sectionId);
    const records = await attendanceRecordsRepository.listBySession(
      req.tenant!.schemaName,
      id,
    );
    const recordsByStudent = new Map(records.map((r) => [r.studentId, r]));

    const rows = students.map((student) => ({
      student,
      record: recordsByStudent.get(student.id) ?? null,
    }));

    // Resumen
    const summary = {
      total: rows.length,
      present: rows.filter((r) => r.record?.status === 'present').length,
      late: rows.filter((r) => r.record?.status === 'late').length,
      absent: rows.filter((r) => r.record?.status === 'absent').length,
      notRecorded: rows.filter((r) => !r.record).length,
    };

    res.json({ session, rows, summary });
  },

  /**
   * PATCH /api/attendance/sessions/:id
   */
  async updateSession(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const parsed = updateAttendanceSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const session = await attendanceSessionsRepository.findById(
      req.tenant!.schemaName,
      id,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const updated = await attendanceSessionsRepository.update(
      req.tenant!.schemaName,
      id,
      parsed.data,
    );
    res.json(updated);
  },

  /**
   * DELETE /api/attendance/sessions/:id
   */
  async deleteSession(req: Request, res: Response) {
    const id = getStringParam(req, res, 'id');
    if (!id) return;

    const session = await attendanceSessionsRepository.findById(
      req.tenant!.schemaName,
      id,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const deleted = await attendanceSessionsRepository.delete(
      req.tenant!.schemaName,
      id,
    );
    res.json({ message: 'Sesión eliminada', session: deleted });
  },

  // ── Registros ──────────────────────────────────────────────

  /**
   * PUT /api/attendance/sessions/:id/records/:studentId
   */
  async upsertRecord(req: Request, res: Response) {
    const sessionId = getStringParam(req, res, 'id');
    if (!sessionId) return;
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const parsed = upsertAttendanceRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const session = await attendanceSessionsRepository.findById(
      req.tenant!.schemaName,
      sessionId,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const student = await studentsRepository.findById(req.tenant!.schemaName, studentId);
    if (!student || !student.isActive) {
      return res.status(404).json({ error: 'Estudiante no encontrado o inactivo' });
    }

    // Validar que el estudiante pertenece a la sección
    const students = await getStudentsOfSection(req.tenant!.schemaName, session.sectionId);
    if (!students.find((s) => s.id === studentId)) {
      return res.status(400).json({
        error: 'El estudiante no está matriculado en esta sección',
      });
    }

    const record = await attendanceRecordsRepository.upsert(
      req.tenant!.schemaName,
      sessionId,
      studentId,
      parsed.data.status,
      parsed.data.notes,
      req.user!.userId,
    );
    res.json(record);
  },

  /**
   * POST /api/attendance/sessions/:id/records/bulk
   */
  async bulkRecords(req: Request, res: Response) {
    const sessionId = getStringParam(req, res, 'id');
    if (!sessionId) return;

    const parsed = bulkAttendanceRecordsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
    }

    const session = await attendanceSessionsRepository.findById(
      req.tenant!.schemaName,
      sessionId,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const students = await getStudentsOfSection(req.tenant!.schemaName, session.sectionId);
    const allowedIds = new Set(students.map((s) => s.id));

    const results: Array<{ studentId: string; ok: boolean; error?: string }> = [];

    for (const r of parsed.data.records) {
      if (!allowedIds.has(r.studentId)) {
        results.push({
          studentId: r.studentId,
          ok: false,
          error: 'Estudiante no pertenece a la sección',
        });
        continue;
      }
      await attendanceRecordsRepository.upsert(
        req.tenant!.schemaName,
        sessionId,
        r.studentId,
        r.status,
        r.notes,
        req.user!.userId,
      );
      results.push({ studentId: r.studentId, ok: true });
    }

    const saved = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    res.json({ sessionId, saved, failed, results });
  },

  /**
   * DELETE /api/attendance/sessions/:id/records/:studentId
   */
  async removeRecord(req: Request, res: Response) {
    const sessionId = getStringParam(req, res, 'id');
    if (!sessionId) return;
    const studentId = getStringParam(req, res, 'studentId');
    if (!studentId) return;

    const session = await attendanceSessionsRepository.findById(
      req.tenant!.schemaName,
      sessionId,
    );
    if (!session) return res.status(404).json({ error: 'Sesión no encontrada' });

    const access = await canManageSection(req, session.sectionId);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason });
    }

    const deleted = await attendanceRecordsRepository.delete(
      req.tenant!.schemaName,
      sessionId,
      studentId,
    );
    if (!deleted) return res.status(404).json({ error: 'Registro no encontrado' });

    res.json({ message: 'Registro eliminado', record: deleted });
  },
};