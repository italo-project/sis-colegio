import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { studentsRepository } from '../students/students.repository';
import { attendanceRecordsRepository } from './attendance.repository';
import { getStringParam } from '../../utils/params';

export type AttendanceSummary = {
  totalSessions: number;
  present: number;
  late: number;
  absent: number;
  notRecorded: number;
  attendanceRate: number | null;
};

export const computeAttendanceSummary = (
  history: Array<{ record: { status: string | null } | null }>,
): AttendanceSummary => {
  let present = 0;
  let late = 0;
  let absent = 0;
  let notRecorded = 0;

  for (const item of history) {
    if (!item.record || !item.record.status) {
      notRecorded++;
      continue;
    }
    switch (item.record.status) {
      case 'present':
        present++;
        break;
      case 'late':
        late++;
        break;
      case 'absent':
        absent++;
        break;
    }
  }

  const considered = present + late + absent;
  const attendanceRate =
    considered > 0 ? Math.round(((present + late) / considered) * 10000) / 100 : null;

  return {
    totalSessions: history.length,
    present,
    late,
    absent,
    notRecorded,
    attendanceRate,
  };
};

export const getStudentAttendanceReport = async (
  schemaName: string,
  studentId: string,
) => {
  const student = await studentsRepository.findById(schemaName, studentId);
  if (!student) throw new Error('Estudiante no encontrado');

  const history = await attendanceRecordsRepository.historyByStudent(schemaName, studentId);
  const summary = computeAttendanceSummary(history);

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      dni: student.dni,
    },
    summary,
    history,
  };
};

export const attendanceQueryController = {
  /**
   * GET /api/me/attendance
   */
  async myAttendance(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    const report = await getStudentAttendanceReport(req.tenant!.schemaName, student.id);
    res.json(report);
  },

  async myAttendanceBySection(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'estudiante') {
      return res.status(403).json({ error: 'Solo disponible para estudiantes' });
    }

    const sectionId = getStringParam(req, res, 'sectionId');
    if (!sectionId) return;

    const student = await studentsRepository.findByUserId(req.tenant!.schemaName, user.userId);
    if (!student) {
      return res.status(404).json({ error: 'No estás registrado como estudiante en este colegio' });
    }

    const history = await attendanceRecordsRepository.historyByStudent(
      req.tenant!.schemaName,
      student.id,
      sectionId,
    );
    const summary = computeAttendanceSummary(history);

    res.json({
      student: {
        id: student.id,
        fullName: student.fullName,
        dni: student.dni,
      },
      sectionId,
      summary,
      history,
    });
  },
};