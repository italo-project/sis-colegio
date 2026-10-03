import axios, { AxiosError } from 'axios';
import { getCurrentSubdomain } from '@/lib/subdomain';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: agrega subdominio + token
apiClient.interceptors.request.use((config) => {
  config.headers['X-Tenant-Subdomain'] = getCurrentSubdomain();

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor: maneja 401 y errores globales
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expirado: limpiar y redirigir a login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

// Helper para extraer mensajes de error
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Error desconocido';
};