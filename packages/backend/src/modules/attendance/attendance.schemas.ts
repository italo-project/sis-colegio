import { z } from 'zod';

// ── Sesiones ────────────────────────────────────────────────
export const createAttendanceSessionSchema = z.object({
  sectionId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato esperado: YYYY-MM-DD'),
  topic: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const updateAttendanceSessionSchema = z.object({
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  topic: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
});

export const listAttendanceSessionsQuerySchema = z.object({
  sectionId: z.string().uuid().optional(),
  gradeLevelId: z.string().uuid().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Registros ───────────────────────────────────────────────
export const attendanceStatusEnum = z.enum(['present', 'late', 'absent']);

export const upsertAttendanceRecordSchema = z.object({
  status: attendanceStatusEnum,
  notes: z.string().max(500).optional(),
});

export const bulkAttendanceRecordsSchema = z.object({
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatusEnum,
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(200),
});

export type CreateAttendanceSessionInput = z.infer<typeof createAttendanceSessionSchema>;
export type UpdateAttendanceSessionInput = z.infer<typeof updateAttendanceSessionSchema>;
export type ListAttendanceSessionsQuery = z.infer<typeof listAttendanceSessionsQuerySchema>;
export type UpsertAttendanceRecordInput = z.infer<typeof upsertAttendanceRecordSchema>;
export type BulkAttendanceRecordsInput = z.infer<typeof bulkAttendanceRecordsSchema>;