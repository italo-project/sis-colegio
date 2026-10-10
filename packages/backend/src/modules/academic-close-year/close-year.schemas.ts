import { z } from 'zod';

// ── Listar candidatos a cierre ────────────────────────────────
export const listCandidatesQuerySchema = z.object({
  academicYearId: z.string().uuid(),
});

// ── Cerrar el año (con decisiones) ────────────────────────────
export const studentDecisionSchema = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['promoted', 'repeated', 'graduated', 'transferred']),
  nextSectionId: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).optional(),
});

export const closeYearSchema = z.object({
  academicYearId: z.string().uuid(),
  decisions: z
    .array(studentDecisionSchema)
    .min(1, 'Debes enviar al menos una decisión')
    .max(2000, 'Máximo 2000 estudiantes por lote'),
});

// ── Precarga del siguiente año ────────────────────────────────
export const preloadNextYearSchema = z.object({
  fromAcademicYearId: z.string().uuid(),
  newYear: z.coerce.number().int().min(2000).max(2100),
  newStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  newEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
});

export type ListCandidatesQuery = z.infer<typeof listCandidatesQuerySchema>;
export type StudentDecisionInput = z.infer<typeof studentDecisionSchema>;
export type CloseYearInput = z.infer<typeof closeYearSchema>;
export type PreloadNextYearInput = z.infer<typeof preloadNextYearSchema>;