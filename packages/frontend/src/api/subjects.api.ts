import { apiClient } from './client';
import type {
  CreateSubjectPayload,
  Subject,
  SubjectsListResponse,
  UpdateSubjectPayload,
} from '@/types/subject';

export const subjectsApi = {
  async list(params: { q?: string; area?: string; active?: 'true' | 'false' } = {}) {
    const { data } = await apiClient.get<Subject[] | SubjectsListResponse>('/subjects', { params });

    // El backend de subjects devuelve un array directo; lo normalizamos
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Subject>(`/subjects/${id}`);
    return data;
  },

  async create(payload: CreateSubjectPayload) {
    const { data } = await apiClient.post<Subject>('/subjects', payload);
    return data;
  },

  async update(id: string, payload: UpdateSubjectPayload) {
    const { data } = await apiClient.patch<Subject>(`/subjects/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Subject>(`/subjects/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Subject>(`/subjects/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/subjects/${id}/hard`);
    return data;
  },
};