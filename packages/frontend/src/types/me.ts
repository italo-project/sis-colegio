import type { CourseGradeEntry, CourseAverage, AttendanceStatus } from './grades';

// ── Estudiante ───────────────────────────────────────────────
export type StudentProfile = {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  isActive: boolean;
};

export type MyGradeReport = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
  courses: Array<{
    course: {
      id: string;
      academicYear: { id: string; year: number };
      section: { id: string; name: string };
      gradeLevel: { code: string; name: string; level: string };
      subject: { id: string; code: string; name: string };
      teacher: { id: string; firstName: string; lastName: string };
    };
    entries: CourseGradeEntry[];
    averages: CourseAverage;
  }>;
};

export type MyAttendanceReport = {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
  };
  summary: {
    totalSessions: number;
    present: number;
    late: number;
    absent: number;
    notRecorded: number;
    attendanceRate: number | null;
  };
  history: Array<{
    sessionId: string;
    sessionDate: string;
    topic: string | null;
    section: {
      id: string;
      name: string;
      gradeLevel: { code: string; name: string };
    };
    record: {
      id: string;
      status: AttendanceStatus;
      notes: string | null;
      recordedAt: string | null;
    } | null;
  }>;
};

export type MyCourse = {
  id: string;
  courseId: string;
  studentId: string;
  status: string;
  course: {
    id: string;
    academicYear: { id: string; year: number };
    section: { id: string; name: string; gradeLevel?: { id: string; code: string; name: string; level: string } };
    gradeLevel?: { code: string; name: string; level: string };
    subject: { id: string; code: string; name: string };
    teacher: { id: string; firstName: string; lastName: string };
  };
};

// ── Padre ────────────────────────────────────────────────────
export type Child = {
  studentId: string;
  firstName: string;
  lastName: string;
  dni: string;
  relationship: string;
  isPrimary: boolean;
};

export type MyPayment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  gateway: string | null;
  status: string;
  paidAt: string | null;
  studentId?: string;
  student?: { firstName: string; lastName: string } | null;
};

export type MyInvoice = {
  id: string;
  studentId: string;
  amount: number;
  period: string | null;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  student?: { firstName: string; lastName: string; dni: string };
  feeConcept?: { name: string; code: string };
};

export type FullProfile = {
  role: 'ceo' | 'docente' | 'estudiante' | 'padre';
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    isSuperAdmin: boolean;
  };
  roleData: Record<string, unknown> | null;
  tenant: {
    id: string;
    subdomain: string;
    name: string;
  };
};