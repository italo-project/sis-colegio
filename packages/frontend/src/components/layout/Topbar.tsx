import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { useQuery } from '@tanstack/react-query';
import { meApi } from '@/api/me.api';

export const Topbar = () => {
  const navigate = useNavigate();
  const { user, role, tenant, logout } = useAuthStore();

  const { data: profile } = useQuery({
    queryKey: ['full-profile-topbar'],
    queryFn: meApi.getFullProfile,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const avatarUrl = profile?.user.avatarUrl ?? null;

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 px-6 h-16 flex items-center justify-between">
      <div>
        <h1 className="text-sm font-semibold text-primary-600 tracking-wide">Vioeduca</h1>
        <p className="text-xs text-gray-500">{tenant?.subdomain}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <div className="hidden md:block text-right">
            <div className="font-semibold text-gray-900 text-sm">{user?.fullName}</div>
            <div className="text-xs text-gray-500 capitalize">{role}</div>
          </div>
          <Avatar src={avatarUrl} name={user?.fullName ?? 'Usuario'} size="md" />
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 ml-2"
          title="Cerrar sesión"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};