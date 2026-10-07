import { z } from 'zod';

export const createParentSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(3).max(200),
  dni: z.string().min(6).max(20),
  phone: z.string().max(30).optional(),
  occupation: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
});

export const updateParentSchema = z.object({
  fullName: z.string().min(3).max(200).optional(),
  dni: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  occupation: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .optional()
    .or(z.literal('')),
});

export const listParentsQuerySchema = z.object({
  q: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
});

export const bulkCreateParentsSchema = z.object({
  parents: z
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

export type CreateParentInput = z.infer<typeof createParentSchema>;
export type UpdateParentInput = z.infer<typeof updateParentSchema>;
export type ListParentsQuery = z.infer<typeof listParentsQuerySchema>;
export type BulkCreateParentsInput = z.infer<typeof bulkCreateParentsSchema>;