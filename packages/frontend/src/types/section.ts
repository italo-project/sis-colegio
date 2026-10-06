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

  // Datos expandidos (siempre vienen en list)
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

  // Solo en getById
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