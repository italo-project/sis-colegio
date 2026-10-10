import { z } from 'zod';

// ── Crear estudiante (uno solo) ────────────────────────────────────────
export const createStudentSchema = z.object({
  fullName: z.string().min(1).max(200),
  dni: z.string().min(6).max(20),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .optional()
    .or(z.literal(''))
    .nullable(),
  gender: z.enum(['M', 'F', 'X']).optional().nullable(),
  email: z.string().email('Email inválido'),
  phone: z.string().max(30).optional().or(z.literal('')).nullable(),
  address: z.string().max(500).optional().or(z.literal('')).nullable(),
  sectionId: z.string().uuid(),
  guardianId: z.string().uuid('Debes seleccionar un apoderado'),
});

export const updateStudentSchema = createStudentSchema
  .omit({ dni: true, guardianId: true })
  .partial();

// ── Crear estudiantes (masivo) ────────────────────────────────────────
export const bulkCreateStudentSchema = z.object({
  sectionId: z.string().uuid(),
  students: z
    .array(
      z.object({
        fullName: z.string().min(1).max(200),
        dni: z.string().min(6).max(20),
        birthDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional()
          .or(z.literal('')),
        gender: z.enum(['M', 'F', 'X']).optional(),
        email: z.string().email('Email inválido'),
        phone: z.string().max(30).optional().or(z.literal('')),
        address: z.string().max(500).optional().or(z.literal('')),
        guardianId: z.string().uuid('Debes seleccionar un apoderado'),
      }),
    )
    .min(1)
    .max(100),
});

export const listStudentsQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  sectionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Cambiar de sección ────────────────────────────────────────────────
export const changeSectionSchema = z.object({
  newSectionId: z.string().uuid('Sección inválida'),
  reason: z.string().max(500).optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type BulkCreateStudentInput = z.infer<typeof bulkCreateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
export type ChangeSectionInput = z.infer<typeof changeSectionSchema>;