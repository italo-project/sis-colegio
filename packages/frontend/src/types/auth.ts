export type Role = 'admin' | 'ceo' | 'docente' | 'estudiante' | 'padre';

export type User = {
  id: string;
  email: string;
  fullName: string;
};

export type Tenant = {
  id: string;
  subdomain: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
  role: Role;
  tenant: Tenant;
};