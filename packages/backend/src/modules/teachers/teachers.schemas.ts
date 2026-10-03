import { z } from 'zod';

export const createTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).default('Cambiar123!'),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  dni: z.string().min(6).max(20),
  phone: z.string().max(30).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  specialty: z.string().max(150).optional(),
});

export const updateTeacherSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  dni: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  specialty: z.string().max(150).optional(),
});

export const listTeachersQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;