import { z } from 'zod';

export const createParentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).default('Cambiar123!'),
  firstName: z.string().min(2).max(100),
  lastName: z.string().min(2).max(100),
  dni: z.string().min(6).max(20),
  phone: z.string().max(30).optional(),
  occupation: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
});

export const updateParentSchema = z.object({
  firstName: z.string().min(2).max(100).optional(),
  lastName: z.string().min(2).max(100).optional(),
  dni: z.string().min(6).max(20).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  occupation: z.string().max(150).optional(),
  address: z.string().max(500).optional(),
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

export type CreateParentInput = z.infer<typeof createParentSchema>;
export type UpdateParentInput = z.infer<typeof updateParentSchema>;
export type ListParentsQuery = z.infer<typeof listParentsQuerySchema>;