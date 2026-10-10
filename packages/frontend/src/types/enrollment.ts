export type Enrollment = {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: 'active' | 'withdrawn' | 'completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  student: {
    id: string;
    fullName: string;
    dni: string;
    email: string | null;
  };
  course: {
    id: string;
    academicYear: { id: string; year: number };
    section: {
      id: string;
      name: string;
      gradeLevel: { id: string; code: string; name: string; level: string };
    };
    gradeLevel: { id: string; code: string; name: string; level: string };
    subject: { id: string; code: string; name: string };
    teacher: {
      id: string;
      fullName: string;
    } | null;
  };
};

export type EnrollmentsListResponse = {
  items: Enrollment[];
  total: number;
};

export type CreateEnrollmentPayload = {
  courseId: string;
  studentId: string;
  notes?: string;
};

export type BulkEnrollPayload = {
  courseId: string;
  sectionId: string;
  notes?: string;
};

export type AutoEnrollSectionPayload = {
  sectionId: string;
  studentIds: string[];
};

export type AutoEnrollSectionResponse = {
  studentsProcessed: number;
  enrollmentsCreated: number;
  enrollmentsSkipped: number;
  enrollmentsErrors: number;
  details: Array<{
    studentId: string;
    created: number;
    skipped: number;
    errors: number;
  }>;
};

export type AvailableStudent = {
  id: string;
  fullName: string;
  dni: string;
  email: string | null;
};