import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types/auth';

type Props = {
  allowedRoles?: Role[];
  children?: ReactNode;
};

export const ProtectedRoute = ({ allowedRoles, children }: Props) => {
  const { isAuthenticated, role, mustChangePassword } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si el usuario debe cambiar su contraseña, lo redirigimos
  if (mustChangePassword && location.pathname !== '/change-initial-password') {
    return <Navigate to="/change-initial-password" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="bg-white rounded-xl shadow p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso denegado</h2>
          <p className="text-gray-500">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};