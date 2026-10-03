import { z } from 'zod';

export const createSubjectSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/, 'Solo mayúsculas, números, guion y guion bajo'),
  name: z.string().min(2).max(150),
  description: z.string().max(1000).optional(),
  area: z.string().max(80).optional(),
});

export const updateSubjectSchema = z.object({
  code: z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/).optional(),
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(1000).optional(),
  area: z.string().max(80).optional(),
});

export const listSubjectsQuerySchema = z.object({
  q: z.string().optional(),
  area: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type ListSubjectsQuery = z.infer<typeof listSubjectsQuerySchema>;