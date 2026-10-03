export type Student = {
  id: string;
  userId: string | null;
  hasAccount: boolean;
  firstName: string;
  lastName: string;
  dni: string;
  birthDate: string | null;
  gender: 'M' | 'F' | 'X' | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Solo viene cuando se pide el detalle completo (getById)
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
  firstName: string;
  lastName: string;
  dni: string;
  birthDate?: string;
  gender?: 'M' | 'F' | 'X';
  email?: string;
  phone?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
};

export type UpdateStudentPayload = Partial<CreateStudentPayload>;

export type CreateAccountPayload = {
  email: string;
  password?: string;
};