import { z } from "zod";

export const createEnrollmentSchema = z.object({
  courseId: z.string().uuid(),
  studentId: z.string().uuid(),
  notes: z.string().max(500).optional(),
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(["active", "withdrawn", "completed"]).optional(),
  notes: z.string().max(500).optional(),
});

export const listEnrollmentsQuerySchema = z.object({
  courseId: z.string().uuid().optional(),
  studentId: z.string().uuid().optional(),
  status: z.enum(["active", "withdrawn", "completed"]).optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;
