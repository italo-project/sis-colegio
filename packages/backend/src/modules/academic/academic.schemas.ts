import { z } from 'zod';

// ── Años escolares ───────────────────────────────────────────
export const createAcademicYearSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  isActive: z.boolean().optional(),
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

// ── Secciones ────────────────────────────────────────────────
export const createSectionSchema = z.object({
  academicYearId: z.string().uuid(),
  gradeLevelId: z.string().uuid(),
  name: z.string().min(1).max(10),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateSectionSchema = createSectionSchema.partial().omit({
  academicYearId: true,
  gradeLevelId: true,
});

export const listSectionsQuerySchema = z.object({
  yearId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
});
export const assignTutorSchema = z.object({
  tutorUserId: z.string().uuid().nullable(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ListSectionsQuery = z.infer<typeof listSectionsQuerySchema>;
export type AssignTutorInput = z.infer<typeof assignTutorSchema>;