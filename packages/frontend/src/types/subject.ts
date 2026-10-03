export type Subject = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  area: string | null;
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

export type SubjectsListResponse = {
  items: Subject[];
  total: number;
};

export type CreateSubjectPayload = {
  code: string;
  name: string;
  description?: string;
  area?: string;
};

export type UpdateSubjectPayload = Partial<Omit<CreateSubjectPayload, 'code'>> & {
  code?: string;
};