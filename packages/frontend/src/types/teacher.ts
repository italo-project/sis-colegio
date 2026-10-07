export type PaymentType = 'hourly' | 'monthly';

export type Teacher = {
  id: string;
  userId: string;
  fullName: string;
  dni: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  hireDate: string | null;
  specialty: string | null;
  address: string | null;
  paymentType: PaymentType | null;
  hourlyRate: number | null;
  monthlySalary: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Solo en getById
  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    courses: number;
  };
  weeklyHoursTotal?: number;
};

export type TeachersListResponse = {
  items: Teacher[];
  total: number;
};

export type CreateTeacherPayload = {
  email: string;
  fullName: string;
  dni: string;
  phone?: string;
  birthDate?: string;
  hireDate?: string;
  specialty?: string;
  address?: string;
  paymentType?: PaymentType | null;
  hourlyRate?: number | null;
  monthlySalary?: number | null;
};

export type UpdateTeacherPayload = Partial<CreateTeacherPayload> & {
  password?: string;
};

export type BulkCreateTeacherRow = {
  dni: string;
  fullName: string;
  birthDate?: string;
  email: string;
  phone?: string;
  address?: string;
};

export type BulkCreateTeachersPayload = {
  teachers: BulkCreateTeacherRow[];
};

export type BulkCreateTeachersResponse = {
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