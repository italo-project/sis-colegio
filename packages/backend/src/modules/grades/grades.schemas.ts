import { z } from 'zod';

// ── Categorías ───────────────────────────────────────────────
export const createGradeCategorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  weight: z.coerce.number().min(0).max(100),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export const updateGradeCategorySchema = createGradeCategorySchema.partial();

export type CreateGradeCategoryInput = z.infer<typeof createGradeCategorySchema>;
export type UpdateGradeCategoryInput = z.infer<typeof updateGradeCategorySchema>;

// ── Evaluaciones ─────────────────────────────────────────────
export const createEvaluationSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(500).optional(),
  evaluationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  weight: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().positive().max(1000).default(20),
});

export const updateEvaluationSchema = createEvaluationSchema.partial();

export type CreateEvaluationInput = z.infer<typeof createEvaluationSchema>;
export type UpdateEvaluationInput = z.infer<typeof updateEvaluationSchema>;