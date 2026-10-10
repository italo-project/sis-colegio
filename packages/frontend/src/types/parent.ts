export type Parent = {
  id: string;
  userId: string;
  fullName: string;
  dni: string;
  email: string;
  phone: string | null;
  occupation: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  childrenCount: number;

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
  fullName: string;
  dni: string;
  phone?: string;
  occupation?: string;
  address?: string;
};

export type UpdateParentPayload = Partial<CreateParentPayload> & {
  password?: string;
};

export type BulkCreateParentRow = {
  dni: string;
  fullName: string;
  birthDate?: string;
  email: string;
  phone?: string;
  address?: string;
};

export type BulkCreateParentsPayload = {
  parents: BulkCreateParentRow[];
};

export type BulkCreateParentsResponse = {
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