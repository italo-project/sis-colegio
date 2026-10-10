export type SuggestedStatus = 'promoted' | 'repeated' | 'graduated' | 'transferred';

export type CloseYearCandidate = {
  studentId: string;
  fullName: string;
  dni: string;
  section: {
    id: string;
    name: string;
    gradeLevel: {
      id: string;
      name: string;
      code: string;
      level: string;
      orderIndex: number;
    };
  } | null;
  finalAverage: number | null;
  suggestedStatus: SuggestedStatus;
};

export type CloseYearCandidatesResponse = {
  academicYear: {
    id: string;
    year: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
  };
  candidates: CloseYearCandidate[];
  totals: {
    total: number;
    promoted: number;
    repeated: number;
    graduated: number;
  };
};

export type StudentDecision = {
  studentId: string;
  status: SuggestedStatus;
  nextSectionId?: string | null;
  notes?: string;
};

export type CloseYearPayload = {
  academicYearId: string;
  decisions: StudentDecision[];
};

export type CloseYearResponse = {
  ok: true;
  totalDecisions: number;
  inserted: number;
  errors: Array<{ studentId: string; error: string }>;
};

export type PreloadNextYearPayload = {
  fromAcademicYearId: string;
  newYear: number;
  newStartDate: string;
  newEndDate: string;
};

export type PreloadNextYearResponse = {
  ok: true;
  newAcademicYear: {
    id: string;
    year: number;
    startDate: string;
    endDate: string;
  };
  createdSections: Array<{
    oldSectionId: string;
    newSectionId: string;
    sectionName: string;
    gradeLevelId: string;
  }>;
  gradeLevels: Array<{
    id: string;
    code: string;
    name: string;
    level: string;
    order_index: number;
  }>;
  nextGradeMap: Record<string, { id: string; name: string }>;
};

export type AssignNextSectionsPayload = {
  academicYearId: string;
  assignments: Array<{
    studentId: string;
    nextSectionId: string;
  }>;
};

export type StudentYearEndHistoryItem = {
  id: string;
  academicYearId: string;
  year: number;
  finalAverage: number | null;
  status: SuggestedStatus;
  nextSection: { id: string; name: string } | null;
  notes: string | null;
  closedAt: string;
};

export type StudentYearEndHistoryResponse = {
  items: StudentYearEndHistoryItem[];
  total: number;
};