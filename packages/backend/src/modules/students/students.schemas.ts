import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  dni: z.string().min(6).max(20),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD').optional(),
  gender: z.enum(['M', 'F', 'X']).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  guardianName: z.string().max(200).optional(),
  guardianPhone: z.string().max(30).optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const listStudentsQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;