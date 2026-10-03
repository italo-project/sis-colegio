export type Teacher = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  hireDate: string | null;
  specialty: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Solo en getById
  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    courses: number;
  };
};

export type TeachersListResponse = {
  items: Teacher[];
  total: number;
};

export type CreateTeacherPayload = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string;
  birthDate?: string;
  hireDate?: string;
  specialty?: string;
};

export type UpdateTeacherPayload = Partial<Omit<CreateTeacherPayload, 'password' | 'email'>> & {
  email?: string;
};