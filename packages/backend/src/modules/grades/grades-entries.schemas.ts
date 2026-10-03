import { z } from 'zod';

export const upsertGradeEntrySchema = z.object({
  score: z.coerce.number().min(0).max(1000).nullable().optional(),
  feedback: z.string().max(2000).optional(),
});

export const bulkGradeEntriesSchema = z.object({
  grades: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        score: z.coerce.number().min(0).max(1000).nullable(),
        feedback: z.string().max(2000).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export type UpsertGradeEntryInput = z.infer<typeof upsertGradeEntrySchema>;
export type BulkGradeEntriesInput = z.infer<typeof bulkGradeEntriesSchema>;