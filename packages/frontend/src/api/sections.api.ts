import { apiClient } from './client';
import type {
  AcademicYear,
  AssignTutorPayload,
  BulkCreateSectionsPayload,
  BulkCreateSectionsResponse,
  CreateSectionPayload,
  GradeLevel,
  Section,
  SectionCourse,
  SectionStudent,
  UpdateSectionPayload,
} from '@/types/section';

export const sectionsApi = {
  async list(params: { yearId?: string; gradeLevelId?: string; active?: 'true' | 'false' } = {}) {
    const { data } = await apiClient.get<Section[]>('/academic/sections', { params });
    return data;
  },

  async getById(id: string) {
    const { data } = await apiClient.get<Section>(`/academic/sections/${id}`);
    return data;
  },

  async create(payload: CreateSectionPayload) {
    const { data } = await apiClient.post<Section>('/academic/sections', payload);
    return data;
  },

  async update(id: string, payload: UpdateSectionPayload) {
    const { data } = await apiClient.patch<Section>(`/academic/sections/${id}`, payload);
    return data;
  },

  async deactivate(id: string) {
    const { data } = await apiClient.delete<Section>(`/academic/sections/${id}`);
    return data;
  },

  async reactivate(id: string) {
    const { data } = await apiClient.post<Section>(`/academic/sections/${id}/reactivate`);
    return data;
  },

  async hardDelete(id: string) {
    const { data } = await apiClient.delete<{ message: string }>(`/academic/sections/${id}/hard`);
    return data;
  },

  async assignTutor(id: string, payload: AssignTutorPayload) {
    const { data } = await apiClient.patch<Section>(`/academic/sections/${id}/tutor`, payload);
    return data;
  },

  // Catálogos para selects
  async listAcademicYears() {
    const { data } = await apiClient.get<AcademicYear[]>('/academic/years');
    return data;
  },

  async listGradeLevels() {
    const { data } = await apiClient.get<GradeLevel[]>('/academic/grade-levels');
    return data;
  },

  async getDetail(id: string) {
    const { data } = await apiClient.get(`/academic/sections/${id}/detail`);
    return data;
  },

  async listStudents(id: string) {
    const { data } = await apiClient.get<{
      items: SectionStudent[];
      total: number;
    }>(`/academic/sections/${id}/students`);
    return data;
  },

  async listCourses(id: string) {
    const { data } = await apiClient.get<{
      items: SectionCourse[];
      total: number;
    }>(`/academic/sections/${id}/courses`);
    return data;
  },

  async bulkCreate(payload: BulkCreateSectionsPayload) {
    const { data } = await apiClient.post<BulkCreateSectionsResponse>(
      '/academic/sections/bulk',
      payload,
    );
    return data;
  },
};