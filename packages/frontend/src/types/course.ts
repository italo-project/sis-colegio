export type Course = {
  id: string;
  academicYearId: string;
  sectionId: string;
  subjectId: string;
  teacherId: string;
  weeklyHours: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Datos expandidos (siempre vienen)
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
    firstName: string;
    lastName: string;
    dni?: string;
    email?: string;
  };

  // Solo en getById
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
  teacherId: string;
  weeklyHours?: number;
};

export type UpdateCoursePayload = {
  teacherId?: string;
  weeklyHours?: number;
  isActive?: boolean;
};