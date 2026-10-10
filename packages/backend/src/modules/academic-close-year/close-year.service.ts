import { closeYearRepository } from './close-year.repository';
import type {
  CloseYearInput,
  PreloadNextYearInput,
} from './close-year.schemas';

export const closeYearService = {
  /**
   * Lista candidatos a cierre del año escolar con sugerencia de estado.
   */
  async listCandidates(schemaName: string, academicYearId: string) {
    const year = await closeYearRepository.getAcademicYear(schemaName, academicYearId);
    if (!year) {
      throw new Error('Año escolar no encontrado');
    }

    const candidates = await closeYearRepository.listCandidates(schemaName, academicYearId);

    return {
      academicYear: {
        id: year.id,
        year: year.year,
        startDate: year.start_date,
        endDate: year.end_date,
        isActive: year.is_active,
      },
      candidates,
      totals: {
        total: candidates.length,
        promoted: candidates.filter((c) => c.suggestedStatus === 'promoted').length,
        repeated: candidates.filter((c) => c.suggestedStatus === 'repeated').length,
        graduated: candidates.filter((c) => c.suggestedStatus === 'graduated').length,
      },
    };
  },

  /**
   * Cierra el año escolar con las decisiones dadas.
   */
  async closeYear(schemaName: string, input: CloseYearInput, closedBy: string) {
    const result = await closeYearRepository.closeYear(schemaName, input, closedBy);
    return result;
  },

  /**
   * Precarga el siguiente año escolar.
   */
  async preloadNextYear(schemaName: string, input: PreloadNextYearInput) {
    return closeYearRepository.preloadNextYear(schemaName, input, 'system');
  },

  /**
   * Asigna las secciones del año nuevo a los promovidos.
   */
  async assignNextSections(
    schemaName: string,
    academicYearId: string,
    assignments: Array<{ studentId: string; nextSectionId: string }>,
  ) {
    return closeYearRepository.assignNextSections(
      schemaName,
      academicYearId,
      assignments,
    );
  },

  /**
   * Historial de cierres de un estudiante.
   */
  async getStudentHistory(schemaName: string, studentId: string) {
    return closeYearRepository.getStudentYearEndHistory(schemaName, studentId);
  },
};