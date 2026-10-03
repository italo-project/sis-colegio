import { z } from 'zod';

export const createOrganizationSchema = z.object({
  // Datos del colegio
  name: z.string().min(3).max(200),
  subdomain: z.string().min(2).max(50).regex(/^[a-z][a-z0-9-]{1,48}$/),
  schemaName: z.string().min(3).max(63).regex(/^[a-z][a-z0-9_]{2,62}$/),
  plan: z.enum(['basic', 'pro', 'business', 'enterprise']).default('basic'),

  // Datos del CEO
  ceoFullName: z.string().min(3).max(200),
  ceoEmail: z.string().email(),
  ceoPassword: z.string().min(8).default('Cambiar123!'),

  // Configuración inicial (opcional)
  createCurrentYear: z.boolean().default(true),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  plan: z.enum(['basic', 'pro', 'business', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
});

export const listOrganizationsQuerySchema = z.object({
  q: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  plan: z.enum(['basic', 'pro', 'business', 'enterprise']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;