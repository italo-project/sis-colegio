import { prisma } from '../../config/prisma';
import { assertSafeSchemaName } from '../../utils/tenant-schema';
import { normalizePhone, sendTextMessage } from './whatsapp.client';

type AttendanceRecordForNotify = {
  studentId: string;
  studentName: string;
  status: 'present' | 'late' | 'absent';
};

type NotifyResult = {
  totalStudents: number;
  totalSent: number;
  totalSkipped: number; // sin teléfono o sin padres
  totalFailed: number;
  details: Array<{
    studentId: string;
    studentName: string;
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
  }>;
};

/**
 * Obtiene los padres con teléfono vinculados a un estudiante.
 */
const getParentsWithPhone = async (
  schemaName: string,
  studentId: string,
): Promise<Array<{ id: string; fullName: string; phone: string; relationship: string }>> => {
  assertSafeSchemaName(schemaName);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      full_name: string;
      phone: string | null;
      relationship: string;
    }>
  >(
    `SELECT p.id, p.full_name, p.phone, sp.relationship
       FROM "${schemaName}".student_parents sp
       JOIN "${schemaName}".parents p ON p.id = sp.parent_id
      WHERE sp.student_id = $1::uuid
        AND p.is_active = true
        AND p.phone IS NOT NULL
        AND TRIM(p.phone) <> ''`,
    studentId,
  );

  return rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    phone: r.phone as string,
    relationship: r.relationship,
  }));
};

/**
 * Construye el mensaje de WhatsApp para un padre.
 */
const buildAbsenceMessage = (params: {
  parentName: string;
  studentName: string;
  schoolName: string;
  date: string; // YYYY-MM-DD
}): string => {
  const { parentName, studentName, schoolName, date } = params;

  // Convertir YYYY-MM-DD a DD/MM/YYYY
  const [year, month, day] = date.split('-');
  const formattedDate = `${day}/${month}/${year}`;

  // Primer nombre del padre para el saludo
  const firstName = parentName.split(' ')[0] ?? parentName;

  return [
    `🏫 *${schoolName}*`,
    '',
    `Hola ${firstName}, te informamos sobre la asistencia de *${studentName}* hoy ${formattedDate}:`,
    '',
    `❌ Tu hijo(a) *${studentName}* faltó a clases el día de hoy`,
    '',
    `Si tienes alguna duda, contacta al colegio.`,
  ].join('\n');
};

/**
 * Notifica por WhatsApp a los padres de los estudiantes que faltaron.
 * Solo envía a estudiantes con status 'absent'.
 * Los 'present' y 'late' no generan mensaje.
 */
export const notifyAbsencesForSession = async (
  schemaName: string,
  sessionId: string,
): Promise<NotifyResult> => {
  assertSafeSchemaName(schemaName);

  // 1. Datos de la sesión + colegio
  const sessionRows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      session_date: Date;
      section_id: string;
    }>
  >(
    `SELECT id, session_date, section_id
       FROM "${schemaName}".attendance_sessions
      WHERE id = $1::uuid
      LIMIT 1`,
    sessionId,
  );

  if (!sessionRows[0]) {
    throw new Error('Sesión no encontrada');
  }

  const session = sessionRows[0];

  // Fecha en formato YYYY-MM-DD
  const d = new Date(session.session_date);
  const dateStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

  // 2. Nombre del colegio
  const orgRows = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT name FROM public.organizations WHERE schema_name = $1 LIMIT 1`,
    schemaName,
  );
  const schoolName = orgRows[0]?.name ?? 'Colegio';

  // 3. Registros de asistencia con estado 'absent'
  const records = await prisma.$queryRawUnsafe<
    Array<{
      student_id: string;
      full_name: string;
      status: string;
    }>
  >(
    `SELECT ar.student_id, s.full_name, ar.status
       FROM "${schemaName}".attendance_records ar
       JOIN "${schemaName}".students s ON s.id = ar.student_id
      WHERE ar.session_id = $1::uuid
        AND ar.status = 'absent'
      ORDER BY s.full_name ASC`,
    sessionId,
  );

  const result: NotifyResult = {
    totalStudents: records.length,
    totalSent: 0,
    totalSkipped: 0,
    totalFailed: 0,
    details: [],
  };

  // 4. Para cada estudiante ausente, notificar a sus padres
  for (const record of records) {
    const parents = await getParentsWithPhone(schemaName, record.student_id);

    const detail = {
      studentId: record.student_id,
      studentName: record.full_name,
      sent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (parents.length === 0) {
      // Log silencioso (opción B elegida por el usuario)
      console.log(
        `⚠️  Sin padres con teléfono para: ${record.full_name} (${record.student_id})`,
      );
      detail.skipped = 1;
      result.totalSkipped++;
      result.details.push(detail);
      continue;
    }

    for (const parent of parents) {
      const normalizedPhone = normalizePhone(parent.phone);

      if (!normalizedPhone) {
        console.log(
          `⚠️  Teléfono inválido para ${parent.fullName}: "${parent.phone}"`,
        );
        detail.skipped++;
        result.totalSkipped++;
        continue;
      }

      const message = buildAbsenceMessage({
        parentName: parent.fullName,
        studentName: record.full_name,
        schoolName,
        date: dateStr,
      });

      const sendResult = await sendTextMessage({
        to: normalizedPhone,
        body: message,
      });

      if (sendResult.ok) {
        detail.sent++;
        result.totalSent++;
      } else {
        detail.failed++;
        result.totalFailed++;
        if (sendResult.error) detail.errors.push(sendResult.error);
      }
    }

    result.details.push(detail);
  }

  return result;
};