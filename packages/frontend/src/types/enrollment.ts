export type Enrollment = {
  id: string;
  courseId: string;
  studentId: string;
  enrolledAt: string;
  status: 'active' | 'withdrawn' | 'completed';
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Expandido
  student: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string;
    email: string | null;
  };
  course: {
    id: string;
    academicYear: { id: string; year: number };
    section: { id: string; name: string };
    gradeLevel: { code: string; name: string; level: string };
    subject: { id: string; code: string; name: string };
    teacher: { id: string; firstName: string; lastName: string };
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
  sectionId: string; // sección de la que se matricularán todos los estudiantes
  notes?: string;
};