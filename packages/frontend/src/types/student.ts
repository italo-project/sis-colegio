export type Student = {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  fullName: string;
  dni: string;
  birthDate: string | null;
  gender: 'M' | 'F' | 'X' | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  sectionId: string | null;
  section: {
    id: string;
    name: string;
    gradeLevel: { name: string; code: string };
    academicYear: { year: number };
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  guardian: {
    id: string;
    fullName: string;
    dni: string;
    relationship: string;
    isPrimary: boolean;
  } | null;

  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    enrollments: number;
    invoices: number;
    payments: number;
    attendance: number;
    gradeEntries: number;
    parents: number;
  };
};

export type StudentsListResponse = {
  items: Student[];
  total: number;
};

export type CreateStudentPayload = {
  fullName: string;
  dni: string;
  birthDate?: string | null;
  gender?: 'M' | 'F' | 'X' | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  sectionId: string;
  guardianId: string;
};

export type UpdateStudentPayload = Partial<Omit<CreateStudentPayload, 'dni' | 'guardianId'>>;

export type StudentCredentials = {
  email: string;
  temporaryPassword: string;
};

export type CreateStudentResponse = Student & {
  credentials?: StudentCredentials;
};

export type CreateAccountPayload = {
  email: string;
  password?: string;
};

export type BulkCreateStudentRow = {
  dni: string;
  fullName: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'X' | '';
  email: string;
  phone?: string;
  address?: string;
  guardianId: string;
};

export type BulkCreateStudentsPayload = {
  sectionId: string;
  students: BulkCreateStudentRow[];
};

export type BulkCreateStudentsResponse = {
  created: number;
  failed: number;
  credentials: Array<{
    row: number;
    fullName: string;
    dni: string;
    email: string;
    password: string;
  }>;
  errors: Array<{
    row: number;
    dni: string;
    fullName: string;
    email: string;
    error?: string;
  }>;
};

export type ChangeSectionPayload = {
  newSectionId: string;
  reason?: string;
};

export type ChangeSectionResponse = {
  ok: boolean;
  previousSectionId: string | null;
  newSectionId: string;
  averageAtExit: number | null;
  enrollmentsCreated: number;
};

export type SectionHistoryItem = {
  id: string;
  sectionId: string;
  sectionName: string;
  gradeLevel: {
    name: string;
    code: string;
    level: string;
  };
  academicYear: {
    id: string;
    year: number;
  };
  enrolledAt: string;
  leftAt: string | null;
  averageAtExit: number | null;
  reason: string | null;
  isCurrent: boolean;
};

export type SectionHistoryResponse = {
  student: {
    id: string;
    fullName: string;
    dni: string;
  };
  items: SectionHistoryItem[];
  total: number;
};