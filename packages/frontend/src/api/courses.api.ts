import { apiClient } from './client';
import type {
  Course,
  CoursesListResponse,
  CreateCoursePayload,
  UpdateCoursePayload,
} from '@/types/course';

export const coursesApi = {
  async list(
    params: {
      yearId?: string;
      sectionId?: string;
      subjectId?: string;
      teacherId?: string;
      active?: 'true' | 'false';
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { data } = await apiClient.get<CoursesListResponse>('/courses', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Course>(`/courses/${id}`);
    return data;
  },

  async create(payload: CreateCoursePayload) {
    const { data } = await apiClient.post<Course>('/courses', payload);
    return data;
  },

  async update(id: string, payload: UpdateCoursePayload) {
    const { data } = await apiClient.patch<Course>(`/courses/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Course>(`/courses/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Course>(`/courses/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/courses/${id}/hard`);
    return data;
  },

  async getStudents(id: string) {
    const { data } = await apiClient.get(`/courses/${id}/students`);
    return data;
  },
};