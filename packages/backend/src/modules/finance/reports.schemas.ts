import { z } from 'zod';

export const dateRangeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gradeLevelId: z.string().uuid().optional(),
  feeConceptId: z.string().uuid().optional(),
});

export const exportInvoicesSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).optional(),
  feeConceptId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
});

export type DateRangeQuery = z.infer<typeof dateRangeSchema>;
export type ExportInvoicesQuery = z.infer<typeof exportInvoicesSchema>;