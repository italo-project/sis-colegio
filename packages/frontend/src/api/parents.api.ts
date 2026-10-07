import { apiClient } from './client';
import type {
  BulkCreateParentsPayload,
  BulkCreateParentsResponse,
  CreateParentPayload,
  Parent,
  ParentsListResponse,
  UpdateParentPayload,
} from '@/types/parent';

export const parentsApi = {
  async list(params: { q?: string; active?: 'true' | 'false'; limit?: number; offset?: number } = {}) {
    const { data } = await apiClient.get<ParentsListResponse>('/parents', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Parent>(`/parents/${id}`);
    return data;
  },

  async create(payload: CreateParentPayload) {
    const { data } = await apiClient.post<Parent & { credentials?: unknown }>('/parents', payload);
    return data;
  },

  async bulkCreate(payload: BulkCreateParentsPayload) {
    const { data } = await apiClient.post<BulkCreateParentsResponse>('/parents/bulk', payload);
    return data;
  },

  async update(id: string, payload: UpdateParentPayload) {
    const { data } = await apiClient.patch<Parent>(`/parents/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Parent>(`/parents/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Parent>(`/parents/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/parents/${id}/hard`);
    return data;
  },
};