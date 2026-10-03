// ── Conceptos ────────────────────────────────────────────────
export type FeeConcept = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  defaultAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateFeeConceptPayload = {
  name: string;
  code: string;
  description?: string;
  defaultAmount: number;
};

export type UpdateFeeConceptPayload = Partial<Omit<CreateFeeConceptPayload, 'code'>>;

// ── Facturas ─────────────────────────────────────────────────
export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export type Invoice = {
  id: string;
  studentId: string;
  feeConceptId: string;
  amount: number;
  period: string | null;
  dueDate: string;
  status: InvoiceStatus;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;

  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
  feeConcept?: {
    id: string;
    name: string;
    code: string;
  };
  payments?: Payment[];
};

export type InvoicesListResponse = {
  items: Invoice[];
  total: number;
};

export type CreateInvoicePayload = {
  studentId: string;
  feeConceptId: string;
  amount?: number;
  period?: string;
  dueDate: string;
  notes?: string;
};

export type BulkInvoicesPayload = {
  sectionId: string;
  feeConceptId: string;
  period?: string;
  dueDate: string;
  notes?: string;
};

// ── Pagos ────────────────────────────────────────────────────
export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  gateway: string | null;
  gatewayTxId: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'refunded';
  payerUserId: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// ── Reportes ─────────────────────────────────────────────────
export type FinanceSummary = {
  byStatus: Record<InvoiceStatus, { count: number; total: number }>;
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  collectionRate: number;
};

export type ReportByPeriod = {
  period: string;
  count: number;
  total: number;
};

export type OverdueInvoice = {
  id: string;
  studentId: string;
  student: { firstName: string; lastName: string; dni: string };
  feeConcept: { name: string; code: string };
  amount: number;
  dueDate: string;
  daysOverdue: number;
};