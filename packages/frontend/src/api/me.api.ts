import { apiClient } from './client';
import type {
  Child,
  FullProfile,
  MyAttendanceReport,
  MyCourse,
  MyGradeReport,
  MyInvoice,
  MyPayment,
  StudentProfile,
} from '@/types/me';

export const meApi = {
  // ── Perfil ────────────────────────────────────────────────
  async getProfile() {
    const { data } = await apiClient.get<{
      role: string;
      tenant: { subdomain: string; name: string };
      profile: StudentProfile | null;
    }>('/me/profile');
    return data;
  },

  // ── Estudiante ────────────────────────────────────────────
  async getMyGrades() {
    const { data } = await apiClient.get<MyGradeReport>('/me/grades');
    return data;
  },

  async getMyGradesByCourse(courseId: string) {
    const { data } = await apiClient.get(`/me/grades/courses/${courseId}`);
    return data;
  },

  async getMyAttendance() {
    const { data } = await apiClient.get<MyAttendanceReport>('/me/attendance');
    return data;
  },

  async getMyCourses() {
    const { data } = await apiClient.get<{ items: MyCourse[]; total: number }>('/me/courses');
    return data;
  },

  // ── Padre ─────────────────────────────────────────────────
  async getMyChildren() {
    const { data } = await apiClient.get<{ items: Child[]; total: number }>('/me/children');
    return data;
  },

  async getChildGrades(childId: string) {
    const { data } = await apiClient.get<MyGradeReport>(`/me/children/${childId}/grades`);
    return data;
  },

  async getChildAttendance(childId: string) {
    const { data } = await apiClient.get<MyAttendanceReport>(
      `/me/children/${childId}/attendance`,
    );
    return data;
  },

  async getMyInvoices() {
    const { data } = await apiClient.get<{ items: MyInvoice[]; total: number }>('/me/invoices');
    return data;
  },

  async getMyPayments() {
    const { data } = await apiClient.get<{ items: MyPayment[]; total: number }>('/me/payments');
    return data;
  },

    async getFullProfile() {
    const { data } = await apiClient.get<FullProfile>('/me/full-profile');
    return data;
  },

  async updatePhone(phone: string | null) {
    const { data } = await apiClient.patch('/me/phone', { phone });
    return data;
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    const { data } = await apiClient.patch('/me/password', { currentPassword, newPassword });
    return data;
  },

  async updateCeoProfile(payload: { fullName?: string; email?: string }) {
    const { data } = await apiClient.patch('/me/profile-ceo', payload);
    return data;
  },

  async updateAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    const { data } = await apiClient.patch('/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  async deleteAvatar() {
    const { data } = await apiClient.delete('/me/avatar');
    return data;
  },

  async getMySections() {
    const { data } = await apiClient.get<{
      items: Array<{
        sectionId: string;
        sectionName: string;
        capacity: number | null;
        isTutor: boolean;
        coursesCount: number;
        gradeLevel: { name: string; code: string; level: string };
        academicYear: { year: number };
      }>;
      total: number;
    }>('/me/sections');
    return data;
  },

};