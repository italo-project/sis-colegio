import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthResponse, Role, Tenant, User } from '@/types/auth';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  role: Role | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      role: null,
      tenant: null,
      isAuthenticated: false,

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
        });
      },
    }),
    {
      name: 'auth-storage',
    },
  ),
);