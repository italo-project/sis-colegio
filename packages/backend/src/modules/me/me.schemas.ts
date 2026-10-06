import { z } from 'zod';

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
});

export const updatePhoneSchema = z.object({
  phone: z.string().max(30).nullable(),
});

export const updateCeoProfileSchema = z.object({
  fullName: z.string().min(3).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  guardianName: z.string().max(200).nullable().optional(),
  guardianPhone: z.string().max(30).nullable().optional(),
});

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdatePhoneInput = z.infer<typeof updatePhoneSchema>;
export type UpdateCeoProfileInput = z.infer<typeof updateCeoProfileSchema>;