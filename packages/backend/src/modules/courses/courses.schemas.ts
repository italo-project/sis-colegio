import { z } from 'zod';

export const createCourseSchema = z.object({
  academicYearId: z.string().uuid(),
  sectionId: z.string().uuid(),
  subjectId: z.string().uuid(),
  teacherId: z.string().uuid(),
  weeklyHours: z.coerce.number().int().min(1).max(40).optional(),
});

export const updateCourseSchema = z.object({
  teacherId: z.string().uuid().optional(),
  weeklyHours: z.coerce.number().int().min(1).max(40).optional(),
  isActive: z.boolean().optional(),
});

export const listCoursesQuerySchema = z.object({
  yearId: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  subjectId: z.string().uuid().optional(),
  teacherId: z.string().uuid().optional(),
  active: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;
