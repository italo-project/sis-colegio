// ── Categorías ───────────────────────────────────────────────
export type GradeCategory = {
  id: string;
  courseId: string;
  name: string;
  description: string | null;
  weight: number;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateGradeCategoryPayload = {
  name: string;
  description?: string;
  weight: number;
  orderIndex?: number;
};

// ── Evaluaciones ─────────────────────────────────────────────
export type Evaluation = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  evaluationDate: string | null;
  weight: number;
  maxScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Cuando viene desde listByCourse
  categoryName?: string;
  categoryWeight?: number;
  categoryOrder?: number;
};

export type CreateEvaluationPayload = {
  name: string;
  description?: string;
  evaluationDate?: string;
  weight: number;
  maxScore?: number;
};

// ── Notas ────────────────────────────────────────────────────
export type GradeEntry = {
  id: string;
  evaluationId: string;
  studentId: string;
  score: number | null;
  feedback: string | null;
  gradedBy: string | null;
  gradedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CourseGradeEntry = GradeEntry & {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  evaluationName: string;
  evaluationWeight: number;
  evaluationDate: string | null;
  evaluationMaxScore: number;
};

export type CategoryAverage = {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  average: number | null;
  totalWeightUsed: number;
  totalWeightPossible: number;
};

export type CourseAverage = {
  categories: CategoryAverage[];
  finalAverage: number | null;
};

export type StudentGradesReport = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
  entries: CourseGradeEntry[];
  averages: CourseAverage;
};

export type EvaluationSheet = {
  evaluation: {
    id: string;
    name: string;
    maxScore: number;
    weight: number;
    evaluationDate: string | null;
  };
  rows: Array<{
    student: {
      id: string;
      firstName: string;
      lastName: string;
      dni: string;
      email: string | null;
    };
    grade: GradeEntry | null;
  }>;
  total: number;
};

// ── Asistencia ───────────────────────────────────────────────
export type AttendanceStatus = 'present' | 'late' | 'absent';

export type AttendanceSession = {
  id: string;
  sectionId: string;
  sessionDate: string;
  topic: string | null;
  notes: string | null;
  takenBy: string;
  createdAt: string;
  updatedAt: string;

  section?: {
    id: string;
    name: string;
    gradeLevel: { id: string; code: string; name: string; level: string };
  };
  academicYear?: { id: string; year: number };
};

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;

  student?: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
};

export type AttendanceSheet = {
  session: AttendanceSession;
  rows: Array<{
    student: {
      id: string;
      firstName: string;
      lastName: string;
      dni: string;
    };
    record: AttendanceRecord | null;
  }>;
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    notRecorded: number;
  };
};

export type CreateAttendanceSessionPayload = {
  sectionId: string;
  sessionDate: string;
  topic?: string;
  notes?: string;
};