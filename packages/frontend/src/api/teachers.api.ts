import { apiClient } from './client';
import type {
  BulkCreateTeachersPayload,
  BulkCreateTeachersResponse,
  CreateTeacherPayload,
  Teacher,
  TeachersListResponse,
  UpdateTeacherPayload,
} from '@/types/teacher';

export const teachersApi = {
  async list(params: { q?: string; active?: 'true' | 'false'; limit?: number; offset?: number } = {}) {
    const { data } = await apiClient.get<TeachersListResponse>('/teachers', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Teacher>(`/teachers/${id}`);
    return data;
  },

  async create(payload: CreateTeacherPayload) {
    const { data } = await apiClient.post<Teacher & { credentials?: unknown }>('/teachers', payload);
    return data;
  },

  async bulkCreate(payload: BulkCreateTeachersPayload) {
    const { data } = await apiClient.post<BulkCreateTeachersResponse>('/teachers/bulk', payload);
    return data;
  },

  async update(id: string, payload: UpdateTeacherPayload) {
    const { data } = await apiClient.patch<Teacher>(`/teachers/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Teacher>(`/teachers/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Teacher>(`/teachers/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/teachers/${id}/hard`);
    return data;
  },
};