export type Course = {
  id: string;
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
  weeklyHours: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  academicYear: {
    id: string;
    year: number;
  };
  section: {
    id: string;
    name: string;
    gradeLevel?: {
      id: string;
      code: string;
      name: string;
      level: string;
    };
  };
  subject: {
    id: string;
    code: string;
    name: string;
    area?: string | null;
  };
  teacher: {
    id: string;
    fullName: string;
    dni?: string;
    email?: string;
  } | null;

  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    enrollments: number;
    gradeCategories: number;
  };
};

export type CoursesListResponse = {
  items: Course[];
  total: number;
};

export type CreateCoursePayload = {
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string | null;
  weeklyHours?: number;
};

export type UpdateCoursePayload = {
  teacherId?: string | null;
  weeklyHours?: number;
  isActive?: boolean;
};

export type AutoGenerateCourseItem = {
  subjectId: string;
  teacherId: string | null;
  weeklyHours?: number | null;
};

export type AutoGenerateCoursesPayload = {
  sectionId: string;
  courses: AutoGenerateCourseItem[];
};

export type AutoGenerateCoursesResponse = {
  created: number;
  skipped: number;
  failed: number;
  created_courses: Array<{ id: string; subjectId: string }>;
  skipped_courses: Array<{ subjectId: string; reason: string }>;
  errors: Array<{ subjectId: string; error: string }>;
};