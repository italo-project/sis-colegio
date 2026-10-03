import { apiClient } from './client';
import type {
  AttendanceSession,
  AttendanceSheet,
  CreateAttendanceSessionPayload,
} from '@/types/grades';

export const attendanceApi = {
  async listSessions(params: { sectionId?: string; fromDate?: string; toDate?: string } = {}) {
    const { data } = await apiClient.get<{ items: AttendanceSession[]; total: number }>(
      '/attendance/sessions',
      { params },
    );
    return data;
  },

  async getSession(id: string) {
    const { data } = await apiClient.get<AttendanceSheet>(`/attendance/sessions/${id}`);
    return data;
  },

  async createSession(payload: CreateAttendanceSessionPayload) {
    const { data } = await apiClient.post<AttendanceSession>('/attendance/sessions', payload);
    return data;
  },

  async upsertRecord(sessionId: string, studentId: string, status: string, notes?: string) {
    const { data } = await apiClient.put(
      `/attendance/sessions/${sessionId}/records/${studentId}`,
      { status, notes },
    );
    return data;
  },

  async bulkRecords(
    sessionId: string,
    records: Array<{ studentId: string; status: string; notes?: string }>,
  ) {
    const { data } = await apiClient.post(
      `/attendance/sessions/${sessionId}/records/bulk`,
      { records },
    );
    return data;
  },

  async deleteSession(id: string) {
    const { data } = await apiClient.delete(`/attendance/sessions/${id}`);
    return data;
  },
};