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
    fullName: string;
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
      fullName: string;
      dni: string;
      email: string | null;
    };
    grade: GradeEntry | null;
  }>;
  total: number;
};

export type AttendanceStatus = 'present' | 'late' | 'absent';

export type AttendanceSession = {
  id: string;
  sectionId: string;
  sessionDate: string;
  topic: string | null;
  notes: string | null;
  takenBy: string;
  isFinal: boolean;
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
    fullName: string;
    dni: string;
  };
};

export type AttendanceSheet = {
  session: AttendanceSession;
  rows: Array<{
    student: {
      id: string;
      fullName: string;
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

export type SendWhatsAppResult = {
  totalStudents: number;
  totalSent: number;
  totalSkipped: number;
  totalFailed: number;
  details: Array<{
    studentId: string;
    studentName: string;
    sent: number;
    skipped: number;
    failed: number;
    errors: string[];
  }>;
};

export type BulkRecordsResponse = {
  sessionId: string;
  saved: number;
  failed: number;
  results: Array<{ studentId: string; ok: boolean; error?: string }>;
  sessionClosed: boolean;
  notification: SendWhatsAppResult | { error: string } | null;
};

// ... (todo lo que ya tenías)

export type StudentFullReport = {
  student: {
    id: string;
    fullName: string;
    dni: string;
  };
  courses: Array<{
    course: {
      id: string;
      academicYear: { id: string; year: number };
      section: { id: string; name: string };
      gradeLevel: { code: string; name: string; level: string };
      subject: { id: string; code: string; name: string };
      teacher: { id: string; fullName: string } | null;
    };
    entries: Array<{
      id: string;
      score: number | null;
      feedback: string | null;
      gradedAt: string | null;
      categoryId: string;
      categoryName: string;
      categoryWeight: number;
      evaluationId: string;
      evaluationName: string;
      evaluationWeight: number;
      evaluationDate: string | null;
      evaluationMaxScore: number;
    }>;
    averages: {
      categories: Array<{
        categoryId: string;
        categoryName: string;
        categoryWeight: number;
        average: number | null;
        totalWeightUsed: number;
        totalWeightPossible: number;
      }>;
      finalAverage: number | null;
    };
  }>;
};