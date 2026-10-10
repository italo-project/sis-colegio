import { apiClient } from './client';
import type {
  BulkCreateStudentsPayload,
  BulkCreateStudentsResponse,
  ChangeSectionPayload,
  ChangeSectionResponse,
  CreateAccountPayload,
  CreateStudentPayload,
  CreateStudentResponse,
  SectionHistoryResponse,
  Student,
  StudentsListResponse,
  UpdateStudentPayload,
} from '@/types/student';

export const studentsApi = {
  async list(params: { q?: string; active?: 'true' | 'false'; limit?: number; offset?: number } = {}) {
    const { data } = await apiClient.get<StudentsListResponse>('/students', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Student>(`/students/${id}`);
    return data;
  },

  async create(payload: CreateStudentPayload) {
    const { data } = await apiClient.post<CreateStudentResponse>('/students', payload);
    return data;
  },

  async bulkCreate(payload: BulkCreateStudentsPayload) {
    const { data } = await apiClient.post<BulkCreateStudentsResponse>(
      '/students/bulk',
      payload,
    );
    return data;
  },

  async update(id: string, payload: UpdateStudentPayload) {
    const { data } = await apiClient.patch<Student>(`/students/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Student>(`/students/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Student>(`/students/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/students/${id}/hard`);
    return data;
  },

  async createAccount(id: string, payload: CreateAccountPayload) {
    const { data } = await apiClient.post(`/students/${id}/create-account`, payload);
    return data;
  },

  async getCourses(id: string) {
    const { data } = await apiClient.get(`/students/${id}/courses`);
    return data;
  },

  async getParents(id: string) {
    const { data } = await apiClient.get(`/students/${id}/parents`);
    return data;
  },

  // ── Cambio de sección ─────────────────────────────────────────────────
  async changeSection(id: string, payload: ChangeSectionPayload) {
    const { data } = await apiClient.post<ChangeSectionResponse>(
      `/students/${id}/change-section`,
      payload,
    );
    return data;
  },

  // ── Historial de secciones ────────────────────────────────────────────
  async getSectionHistory(id: string) {
    const { data } = await apiClient.get<SectionHistoryResponse>(
      `/students/${id}/section-history`,
    );
    return data;
  },
};