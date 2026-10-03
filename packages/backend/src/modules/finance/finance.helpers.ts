import { prisma } from '../../config/prisma';
import { feeAmountsRepository } from './finance.repository';

/**
 * Calcula el monto de un concepto para un estudiante específico.
 * - Busca el grade_level del estudiante (a través de su sección/matrícula).
 * - Busca el monto específico en fee_amounts.
 * - Si no hay monto específico, usa el default_amount del concepto.
 */
export const resolveAmountForStudent = async (
  schemaName: string,
  studentId: string,
  feeConceptId: string,
  defaultAmount: number,
): Promise<number> => {
  // Obtener el grade_level del estudiante a través de su matrícula activa
  const rows = await prisma.$queryRawUnsafe<Array<{ grade_level_id: string }>>(
    `SELECT DISTINCT s.grade_level_id
     FROM "${schemaName}".enrollments e
     JOIN "${schemaName}".courses c ON c.id = e.course_id
     JOIN "${schemaName}".sections s ON s.id = c.section_id
     WHERE e.student_id = $1::uuid AND e.status = 'active'
     LIMIT 1`,
    studentId,
  );

  if (!rows[0]) {
    // Estudiante sin matrícula activa: usar default
    return defaultAmount;
  }

  const specific = await feeAmountsRepository.findAmountForGrade(
    schemaName,
    feeConceptId,
    rows[0].grade_level_id,
  );

  return specific ?? defaultAmount;
};