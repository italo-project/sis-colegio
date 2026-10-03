import { apiClient } from './client';
import type {
  CreateAccountPayload,
  CreateStudentPayload,
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
    const { data } = await apiClient.post<Student>('/students', payload);
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
};