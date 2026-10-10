import { z } from 'zod';

export const createCourseSchema = z.object({
  academicYearId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid().nullable(),  // ← cambiar a nullable
  weeklyHours: z.coerce.number().int().min(1).max(40).optional(),
});

export const updateCourseSchema = z.object({
  teacherId: z.string().uuid().optional(),
  weeklyHours: z.coerce.number().int().min(1).max(40).optional(),
  isActive: z.boolean().optional(),
});

export const listCoursesQuerySchema = z.object({
  yearId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Auto-generar cursos ────────────────────────────────────────────────
export const autoGenerateCoursesSchema = z.object({
  sectionId: z.string().uuid(),
  courses: z
    .array(
      z.object({
        subjectId: z.string().uuid(),
        teacherId: z.string().uuid().nullable(), // null = sin asignar
        weeklyHours: z.coerce.number().int().min(1).max(40).optional().nullable(),
      }),
    )
    .min(1, 'Selecciona al menos una materia')
    .max(30, 'Máximo 30 cursos por lote'),
});


export type AutoGenerateCoursesInput = z.infer<typeof autoGenerateCoursesSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
