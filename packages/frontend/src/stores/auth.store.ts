import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, Role, Tenant, User } from '@/types/auth';

type SuperAdminUser = User & { isSuperAdmin?: boolean };

type ImpersonationInfo = {
  originalAccessToken: string;
  originalRefreshToken: string;
  originalUser: SuperAdminUser;
  originalTenant: Tenant | null;
  originalRole: Role | 'admin' | null;
  impersonatedUser: SuperAdminUser;
  impersonatedByName: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: SuperAdminUser | null;
  role: Role | 'admin' | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  impersonation: ImpersonationInfo | null;

  login: (data: AuthResponse & { user: SuperAdminUser }) => void;
  logout: () => void;
  startImpersonation: (data: {
    accessToken: string;
    user: SuperAdminUser;
    tenant: Tenant;
    role: Role;
    impersonatedByName: string;
  }) => void;
  endImpersonation: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      role: null,
      tenant: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      impersonation: null,

      login: (data) => {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        set({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          user: data.user,
          role: data.role,
          tenant: data.tenant,
          isAuthenticated: true,
          isSuperAdmin: data.user?.isSuperAdmin ?? false,
          impersonation: null,
        });
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          role: null,
          tenant: null,
          isAuthenticated: false,
          isSuperAdmin: false,
          impersonation: null,
        });
      },

      startImpersonation: (data) => {
        const current = get();
        if (current.impersonation) {
          // Ya estamos impersonando: no hacemos nada
          return;
        }

        localStorage.setItem('access_token', data.accessToken);
        set({
          accessToken: data.accessToken,
          user: data.user,
          role: data.role,
          tenant: data.tenant,
          isSuperAdmin: false,
          impersonation: {
            originalAccessToken: current.accessToken ?? '',
            originalRefreshToken: current.refreshToken ?? '',
            originalUser: current.user!,
            originalTenant: current.tenant,
            originalRole: current.role,
            impersonatedUser: data.user,
            impersonatedByName: data.impersonatedByName,
          },
        });
      },

      endImpersonation: () => {
        const { impersonation } = get();
        if (!impersonation) return;

        localStorage.setItem('access_token', impersonation.originalAccessToken);
        localStorage.setItem('refresh_token', impersonation.originalRefreshToken);
        set({
          accessToken: impersonation.originalAccessToken,
          refreshToken: impersonation.originalRefreshToken,
          user: impersonation.originalUser,
          tenant: impersonation.originalTenant,
          role: impersonation.originalRole,
          isSuperAdmin: impersonation.originalUser.isSuperAdmin ?? false,
          impersonation: null,
        });
      },
    }),
    { name: 'auth-storage' },
  ),
);