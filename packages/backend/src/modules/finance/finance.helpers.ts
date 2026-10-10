import { prisma } from '../../config/prisma';
import { feeAmountsRepository } from './finance.repository';

/**
 * Calcula el monto de un concepto para un estudiante específico.
 * - Obtiene el grade_level del estudiante a través de su sección actual
 *   (students.section_id → sections.grade_level_id).
 * - Busca el monto específico en fee_amounts.
 * - Si no hay monto específico, usa el default_amount del concepto.
 */
export const resolveAmountForStudent = async (
  schemaName: string,
  studentId: string,
  feeConceptId: string,
  defaultAmount: number,
): Promise<number> => {
  const rows = await prisma.$queryRawUnsafe<Array<{ grade_level_id: string }>>(
    `SELECT sec.grade_level_id
       FROM "${schemaName}".students s
       JOIN "${schemaName}".sections sec ON sec.id = s.section_id
      WHERE s.id = $1::uuid
      LIMIT 1`,
    studentId,
  );

  if (!rows[0]) {
    // Estudiante sin sección asignada: usar default
    return defaultAmount;
  }

  const specific = await feeAmountsRepository.findAmountForGrade(
    schemaName,
    feeConceptId,
    rows[0].grade_level_id,
  );

  return specific ?? defaultAmount;
};