export type GlobalStats = {
  organizations: { total: number; active: number };
  users: number;
  students: number;
  teachers: number;
  finance: {
    totalCollected: number;
    totalPending: number;
  };
};

export type Organization = {
  id: string;
  name: string;
  subdomain: string;
  schemaName: string;
  plan: 'basic' | 'pro' | 'business' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  mercadoPago: {
    connected: boolean;
    connectedAt: string | null;
  };
};

export type OrganizationStats = {
  students: number;
  teachers: number;
  courses: number;
  users: number;
  invoices: {
    totalPaid: number;
    totalPending: number;
  };
};

export type OrganizationMembership = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type CreateOrganizationPayload = {
  name: string;
  subdomain?: string;
  schemaName?: string;
  plan: 'basic' | 'pro' | 'business' | 'enterprise';
  ceoFullName: string;
  ceoEmail: string;
  ceoPassword: string;
};

export type GlobalUser = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  membershipsCount: number;
};

export type UserMembership = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSubdomain: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export type UserDetail = {
  user: GlobalUser;
  memberships: UserMembership[];
};

export type AuditLog = {
  id: string;
  actorUserId: string;
  actorEmail: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};