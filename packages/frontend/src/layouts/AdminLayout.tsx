import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Shield, Building2, LayoutDashboard, LogOut, Users, Activity, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export const AdminLayout = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const menuItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/organizations', label: 'Colegios', icon: Building2 },
    { to: '/admin/users', label: 'Usuarios', icon: Users },
    { to: '/admin/audit-logs', label: 'Auditoría', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* SIDEBAR SUPER ADMIN */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-3 text-slate-900">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
                  <div className="text-sm font-bold leading-tight text-primary-600">Vioeduca</div>
                  <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Super Admin</div>
            </div>
          </div>
        </div>

        {/* Menú */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-slate-900' : 'text-gray-400'}`} />
                    {item.label}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 rounded-xl p-3 mb-2">
            <div className="text-xs font-medium text-gray-900 truncate">{user?.fullName}</div>
            <div className="text-[11px] text-gray-500 truncate">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra superior simple */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-lg font-semibold text-gray-800">Panel de Control Global</h1>
        </header>

        {/* Página actual */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};