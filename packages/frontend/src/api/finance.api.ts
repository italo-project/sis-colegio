import { apiClient } from './client';
import type {
  BulkInvoicesPayload,
  CreateFeeConceptPayload,
  CreateInvoicePayload,
  FeeConcept,
  FinanceSummary,
  Invoice,
  InvoicesListResponse,
  OverdueInvoice,
  ReportByPeriod,
  UpdateFeeConceptPayload,
} from '@/types/finance';

export const financeApi = {
  // ── Conceptos ────────────────────────────────────────────
  async listConcepts(params: { active?: 'true' | 'false' } = {}) {
    const { data } = await apiClient.get<{ items: FeeConcept[]; total: number }>(
      '/finance/fee-concepts',
      { params },
    );
    return data;
  },

  async createConcept(payload: CreateFeeConceptPayload) {
    const { data } = await apiClient.post<FeeConcept>('/finance/fee-concepts', payload);
    return data;
  },

  async updateConcept(id: string, payload: UpdateFeeConceptPayload) {
    const { data } = await apiClient.patch<FeeConcept>(`/finance/fee-concepts/${id}`, payload);
    return data;
  },

  async deactivateConcept(id: string) {
    const { data } = await apiClient.delete<FeeConcept>(`/finance/fee-concepts/${id}`);
    return data;
  },

  // ── Facturas ─────────────────────────────────────────────
  async listInvoices(
    params: {
      studentId?: string;
      feeConceptId?: string;
      status?: string;
      fromDueDate?: string;
      toDueDate?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { data } = await apiClient.get<InvoicesListResponse>('/finance/invoices', { params });
    return data;
  },

  async getInvoice(id: string) {
    const { data } = await apiClient.get<Invoice>(`/finance/invoices/${id}`);
    return data;
  },

  async createInvoice(payload: CreateInvoicePayload) {
    const { data } = await apiClient.post<Invoice>('/finance/invoices', payload);
    return data;
  },

  async bulkInvoices(payload: BulkInvoicesPayload) {
    const { data } = await apiClient.post<{
      created: number;
      skipped: number;
      results: Array<{ studentId: string; ok: boolean; error?: string }>;
    }>('/finance/invoices/bulk', payload);
    return data;
  },

  async cancelInvoice(id: string) {
    const { data } = await apiClient.delete<Invoice>(`/finance/invoices/${id}`);
    return data;
  },

  // ── Reportes ─────────────────────────────────────────────
  async summary() {
    const { data } = await apiClient.get<FinanceSummary>('/finance/reports/summary');
    return data;
  },

  async byPeriod(params: { from?: string; to?: string } = {}) {
    const { data } = await apiClient.get<{ items: ReportByPeriod[] }>(
      '/finance/reports/by-period',
      { params },
    );
    return data;
  },

  async overdue() {
    const { data } = await apiClient.get<{
      items: OverdueInvoice[];
      total: number;
      totalAmount: number;
    }>('/finance/reports/overdue');
    return data;
  },

  async exportInvoicesCsv(params: Record<string, string | undefined>) {
    const response = await apiClient.get('/finance/reports/export/invoices', {
      params,
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};