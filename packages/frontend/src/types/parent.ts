export type Parent = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dni: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Solo en getById
  canBeDeleted?: boolean;
  relatedDataCount?: number;
  relatedBreakdown?: {
    students: number;
  };
};

export type ParentsListResponse = {
  items: Parent[];
  total: number;
};

export type CreateParentPayload = {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string;
  occupation?: string;
  address?: string;
};

export type UpdateParentPayload = Partial<Omit<CreateParentPayload, 'password' | 'email'>> & {
  email?: string;
};