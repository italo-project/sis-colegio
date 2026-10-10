import { apiClient } from './client';
import type {
  AutoEnrollSectionPayload,
  AutoEnrollSectionResponse,
  AvailableStudent,
  CreateEnrollmentPayload,
  Enrollment,
  EnrollmentsListResponse,
} from '@/types/enrollment';

export const enrollmentsApi = {
  async list(
    params: {
      courseId?: string;
      studentId?: string;
      status?: 'active' | 'withdrawn' | 'completed';
    } = {},
  ) {
    const { data } = await apiClient.get<Enrollment[] | EnrollmentsListResponse>(
      '/enrollments',
      { params },
    );

    // El backend devuelve un array directo
    if (Array.isArray(data)) {
      return { items: data, total: data.length };
    }
    return data;
  },

  async create(payload: CreateEnrollmentPayload) {
    const { data } = await apiClient.post<Enrollment>('/enrollments', payload);
    return data;
  },

  async delete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/enrollments/${id}`);
    return data;
  },

  async getCourseStudents(courseId: string) {
    const { data } = await apiClient.get(`/courses/${courseId}/students`);
    return data;
  },

  async getStudentCourses(studentId: string) {
    const { data } = await apiClient.get(`/students/${studentId}/courses`);
    return data;
  },

    async autoEnroll(payload: AutoEnrollSectionPayload) {
    const { data } = await apiClient.post<AutoEnrollSectionResponse>(
      '/enrollments/auto',
      payload,
    );
    return data;
  },

  async availableStudentsForSection(sectionId: string) {
    const { data } = await apiClient.get<{ items: AvailableStudent[]; total: number }>(
      '/enrollments/available-students',
      { params: { sectionId } },
    );
    return data;
  },


};