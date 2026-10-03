import { apiClient } from './client';
import type { AuthResponse } from '@/types/auth';

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return data;
  },

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  },
};