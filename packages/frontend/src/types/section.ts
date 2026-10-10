export type Section = {
  id: string;
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  capacity: number | null;
  tutorUserId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  gradeLevel?: {
    id: string;
    code: string;
    name: string;
    level: string;
  };
  academicYear?: {
    id: string;
    year: number;
  };

  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    courses: number;
    enrollments: number;
  };
};

export type AcademicYear = {
  id: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type GradeLevel = {
  id: string;
  code: string;
  name: string;
  level: string;
  orderIndex: number;
};

export type CreateSectionPayload = {
  academicYearId: string;
  gradeLevelId: string;
  name: string;
  capacity?: number;
};

export type UpdateSectionPayload = {
  name?: string;
  capacity?: number;
};

export type AssignTutorPayload = {
  tutorUserId: string | null;
};

export type SectionDetail = {
  id: string;
  name: string;
  capacity: number | null;
  isActive: boolean;
  tutorUserId: string | null;
  tutor: { fullName: string | null; email: string | null } | null;
  gradeLevel: {
    id: string;
    name: string;
    code: string;
    level: string;
  };
  academicYear: {
    id: string;
    year: number;
  };
  studentsCount: number;
  coursesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type SectionStudent = {
  id: string;
  fullName: string;
  dni: string;
  email: string | null;
  phone: string | null;
  hasAccount: boolean;
  isActive: boolean;
};

export type SectionCourse = {
  id: string;
  subjectId: string;
  subject: { code: string; name: string; area: string | null };
  teacher: { id: string; fullName: string } | null;
  weeklyHours: number | null;
  isActive: boolean;
  studentsCount: number;
};

export type BulkCreateSectionsPayload = {
  academicYearId: string;
  gradeLevelId: string;
  capacity?: number;
  names: string[];
};

export type BulkCreateSectionsResponse = {
  created: number;
  sections: Array<{ id: string; name: string }>;
};