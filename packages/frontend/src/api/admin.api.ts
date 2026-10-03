import { apiClient } from './client';
import type {
  AuditLog,
  CreateOrganizationPayload,
  GlobalStats,
  GlobalUser,
  Organization,
  OrganizationMembership,
  OrganizationStats,
  UserDetail,
} from '@/types/admin';

export const adminApi = {
  async globalStats() {
    const { data } = await apiClient.get<GlobalStats>('/admin/stats');
    return data;
  },

  async listOrganizations(params: { q?: string; isActive?: string; plan?: string } = {}) {
    const { data } = await apiClient.get<{ items: Organization[]; total: number }>(
      '/admin/organizations',
      { params },
    );
    return data;
  },

  async getOrganization(id: string) {
    const { data } = await apiClient.get<{
      organization: Organization;
      stats: OrganizationStats;
      memberships: OrganizationMembership[];
    }>(`/admin/organizations/${id}`);
    return data;
  },

  async createOrganization(payload: CreateOrganizationPayload) {
    const { data } = await apiClient.post<{
      organization: Organization;
      ceo: { id: string; email: string; fullName: string };
      credentials: {
        email: string;
        temporaryPassword: string;
        loginUrl: string;
      };
    }>('/admin/organizations', payload);
    return data;
  },

  async updateOrganization(id: string, payload: { name?: string; plan?: string }) {
    const { data } = await apiClient.patch(`/admin/organizations/${id}`, payload);
    return data;
  },

  async suspendOrganization(id: string) {
    const { data } = await apiClient.post(`/admin/organizations/${id}/suspend`);
    return data;
  },

  async reactivateOrganization(id: string) {
    const { data } = await apiClient.post(`/admin/organizations/${id}/reactivate`);
    return data;
  },

  async superAdminLogin(email: string, password: string) {
    const { data } = await apiClient.post('/auth/super-admin/login', { email, password });
    return data;
  },
    async getOrganizationDataCount(id: string) {
    const { data } = await apiClient.get<{
      total: number;
      breakdown: {
        students: number;
        teachers: number;
        courses: number;
        invoices: number;
        payments: number;
      };
    }>(`/admin/organizations/${id}/data-count`);
    return data;
  },

  async deleteOrganization(
    id: string,
    payload: { confirmationName: string; reason?: string; forceDelete?: boolean },
  ) {
    const { data } = await apiClient.delete(`/admin/organizations/${id}`, { data: payload });
    return data;
  },

  async exportOrganization(id: string) {
    const response = await apiClient.get(`/admin/organizations/${id}/export`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },
  // ── Usuarios ─────────────────────────────────────────────
  async listUsers(
    params: {
      q?: string;
      isActive?: string;
      isSuperAdmin?: string;
      organizationId?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { data } = await apiClient.get<{ items: GlobalUser[]; total: number }>(
      '/admin/users',
      { params },
    );
    return data;
  },

  async getUser(id: string) {
    const { data } = await apiClient.get<UserDetail>(`/admin/users/${id}`);
    return data;
  },

  async updateUser(
    id: string,
    payload: { fullName?: string; email?: string; isActive?: boolean },
  ) {
    const { data } = await apiClient.patch<GlobalUser>(`/admin/users/${id}`, payload);
    return data;
  },

  async resetUserPassword(id: string, newPassword?: string) {
    const { data } = await apiClient.post<{ ok: boolean; newPassword: string }>(
      `/admin/users/${id}/reset-password`,
      { newPassword },
    );
    return data;
  },

  async toggleUserActive(id: string) {
    const { data } = await apiClient.post<GlobalUser>(`/admin/users/${id}/toggle-active`);
    return data;
  },

  async deleteUser(id: string) {
    const { data } = await apiClient.delete<{ ok: boolean }>(`/admin/users/${id}`);
    return data;
  },
    async impersonateUser(userId: string, organizationId?: string) {
    const { data } = await apiClient.post(
      `/admin/impersonate/${userId}`,
      {},
      { params: organizationId ? { organizationId } : {} },
    );
    return data;
  },

  async listAuditLogs(
    params: {
      action?: string;
      actorUserId?: string;
      organizationId?: string;
      fromDate?: string;
      toDate?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { data } = await apiClient.get<{ items: AuditLog[]; total: number }>(
      '/admin/audit-logs',
      { params },
    );
    return data;
  },

};