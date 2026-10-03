import { z } from 'zod';

export const createStudentParentSchema = z.object({
  studentId: z.string().uuid(),
  parentId: z.string().uuid(),
  relationship: z.enum(['padre', 'madre', 'tutor', 'apoderado', 'otro']).default('tutor'),
  isPrimary: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const updateStudentParentSchema = z.object({
  relationship: z.enum(['padre', 'madre', 'tutor', 'apoderado', 'otro']).optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().max(500).optional(),
});

export const listStudentParentsQuerySchema = z.object({
  studentId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

export type CreateStudentParentInput = z.infer<typeof createStudentParentSchema>;
export type UpdateStudentParentInput = z.infer<typeof updateStudentParentSchema>;
export type ListStudentParentsQuery = z.infer<typeof listStudentParentsQuerySchema>;