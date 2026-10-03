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

export const deleteOrganizationSchema = z.object({
  confirmationName: z.string().min(1),
  reason: z.string().max(500).optional(),
  forceDelete: z.boolean().default(false),
});

export const exportOrganizationQuerySchema = z.object({
  format: z.enum(['json']).default('json'),
});

export const listUsersQuerySchema = z.object({
  q: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isSuperAdmin: z.enum(['true', 'false']).optional(),
  organizationId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(3).max(200).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8).default('Cambiar123!'),
});
export const listAuditLogsQuerySchema = z.object({
  action: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type ListOrganizationsQuery = z.infer<typeof listOrganizationsQuerySchema>;
export type DeleteOrganizationInput = z.infer<typeof deleteOrganizationSchema>;
export type ExportOrganizationQuery = z.infer<typeof exportOrganizationQuerySchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;
export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;