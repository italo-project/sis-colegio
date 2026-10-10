import { z } from 'zod';

export const createTeacherSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3).max(200),
  dni: z.string().min(6).max(20),
  phone: z.string().max(30).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  specialty: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  paymentType: z.enum(['hourly', 'monthly']).optional().nullable(),
  hourlyRate: z.coerce.number().min(0).max(100000).optional().nullable(),
  monthlySalary: z.coerce.number().min(0).max(1000000).optional().nullable(),
});

export const updateTeacherSchema = z.object({
  fullName: z.string().min(3).max(200).optional(),
  dni: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  hireDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal('')),
  specialty: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  paymentType: z.enum(['hourly', 'monthly']).optional().nullable(),
  hourlyRate: z.coerce.number().min(0).max(100000).optional().nullable(),
  monthlySalary: z.coerce.number().min(0).max(1000000).optional().nullable(),
  password: z.string().min(8).optional().or(z.literal('')),
});

export const listTeachersQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const bulkCreateTeachersSchema = z.object({
  teachers: z
    .array(
      z.object({
        dni: z.string().min(6).max(20),
        fullName: z.string().min(3).max(200),
        birthDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD')
          .optional()
          .or(z.literal('')),
        email: z.string().email(),
        phone: z.string().max(30).optional().or(z.literal('')),
        address: z.string().max(500).optional().or(z.literal('')),
      }),
    )
    .min(1)
    .max(200),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type ListTeachersQuery = z.infer<typeof listTeachersQuerySchema>;
export type BulkCreateTeachersInput = z.infer<typeof bulkCreateTeachersSchema>;