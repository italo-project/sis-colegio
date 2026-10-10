import { apiClient } from './client';
import type {
  AssignNextSectionsPayload,
  CloseYearCandidatesResponse,
  CloseYearPayload,
  CloseYearResponse,
  PreloadNextYearPayload,
  PreloadNextYearResponse,
  StudentYearEndHistoryResponse,
} from '@/types/close-year';

export const closeYearApi = {
  async listCandidates(academicYearId: string) {
    const { data } = await apiClient.get<CloseYearCandidatesResponse>(
      '/academic/close-year/candidates',
      { params: { academicYearId } },
    );
    return data;
  },

  async closeYear(payload: CloseYearPayload) {
    const { data } = await apiClient.post<CloseYearResponse>(
      '/academic/close-year',
      payload,
    );
    return data;
  },

  async preloadNextYear(payload: PreloadNextYearPayload) {
    const { data } = await apiClient.post<PreloadNextYearResponse>(
      '/academic/preload-next-year',
      payload,
    );
    return data;
  },

  async assignNextSections(payload: AssignNextSectionsPayload) {
    const { data } = await apiClient.post<{
      ok: true;
      updated: number;
      errors: Array<{ studentId: string; error: string }>;
    }>('/academic/assign-next-sections', payload);
    return data;
  },

  async getStudentYearHistory(studentId: string) {
    const { data } = await apiClient.get<StudentYearEndHistoryResponse>(
      `/academic/students/${studentId}/year-history`,
    );
    return data;
  },
};