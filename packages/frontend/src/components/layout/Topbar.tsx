import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export const Topbar = () => {
  const navigate = useNavigate();
  const { user, role, tenant, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">Sistema Colegios</h1>
        <p className="text-xs text-gray-500">{tenant?.subdomain}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-600" />
          </div>
          <div className="hidden md:block">
            <div className="font-medium text-gray-900 text-sm">{user?.fullName}</div>
            <div className="text-xs text-gray-500 capitalize">{role}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};