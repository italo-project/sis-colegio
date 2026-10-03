import { z } from 'zod';

// ── Conceptos ───────────────────────────────────────────────
export const createFeeConceptSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(2).max(30).regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, guion y guion bajo'),
  description: z.string().max(1000).optional(),
  defaultAmount: z.coerce.number().min(0).max(100000),
});

export const updateFeeConceptSchema = createFeeConceptSchema.partial().omit({ code: true });

export const listFeeConceptsQuerySchema = z.object({
  active: z.enum(['true', 'false']).optional(),
});

// ── Montos por grado ────────────────────────────────────────
export const upsertFeeAmountSchema = z.object({
  gradeLevelId: z.string().uuid(),
  amount: z.coerce.number().min(0).max(100000),
});

// ── Facturas ────────────────────────────────────────────────
export const createInvoiceSchema = z.object({
  studentId: z.string().uuid(),
  feeConceptId: z.string().uuid(),
  amount: z.coerce.number().min(0).max(100000).optional(), // si no viene, se calcula
  period: z.string().max(20).optional(), // ej: "2026-03"
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  notes: z.string().max(1000).optional(),
});

export const bulkInvoicesSchema = z.object({
  sectionId: z.string().uuid(),
  feeConceptId: z.string().uuid(),
  period: z.string().max(20).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
});

export const listInvoicesQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  feeConceptId: z.string().uuid().optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  fromDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().max(1000).optional(),
});

// ── Pagos ───────────────────────────────────────────────────
export const simulatePaymentSchema = z.object({
  method: z.enum(['simulated', 'yape', 'card']).default('simulated'),
  notes: z.string().max(500).optional(),
});

export type CreateFeeConceptInput = z.infer<typeof createFeeConceptSchema>;
export type UpdateFeeConceptInput = z.infer<typeof updateFeeConceptSchema>;
export type UpsertFeeAmountInput = z.infer<typeof upsertFeeAmountSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type BulkInvoicesInput = z.infer<typeof bulkInvoicesSchema>;
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type SimulatePaymentInput = z.infer<typeof simulatePaymentSchema>;