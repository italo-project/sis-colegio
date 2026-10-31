import { NavLink } from 'react-router-dom';
import { UserCircle, Trophy } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCog,
  BookOpen,
  Calendar,
  DollarSign,
  FileText,
  Layers,
  UserPlus,
  Receipt,
  Award,
  CalendarCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import type { Role } from '@/types/auth';

// 👇 IMPORTAMOS TU LOGO (Asegúrate de que la ruta y el nombre del archivo sean exactos)
import logoVioeduca from '@/assets/logoVioeduca.png';

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const menuItems: MenuItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ceo', 'docente', 'estudiante', 'padre'] },
  
  // ── CEO ──
  { to: '/students', label: 'Estudiantes', icon: Users, roles: ['ceo'] },
  { to: '/teachers', label: 'Docentes', icon: GraduationCap, roles: ['ceo'] },
  { to: '/parents', label: 'Padres', icon: UserCog, roles: ['ceo'] },
  { to: '/subjects', label: 'Asignaturas', icon: BookOpen, roles: ['ceo'] },
  { to: '/courses', label: 'Cursos', icon: Calendar, roles: ['ceo'] },
  { to: '/sections', label: 'Secciones', icon: Layers, roles: ['ceo'] },
  { to: '/enrollments', label: 'Matrículas', icon: UserPlus, roles: ['ceo'] },
  { to: '/my-sections', label: 'Asistencias', icon: CalendarCheck, roles: ['ceo'] },
  { to: '/finance', label: 'Finanzas', icon: DollarSign, roles: ['ceo'] },
  { to: '/finance/concepts', label: 'Conceptos de cobro', icon: FileText, roles: ['ceo'] },
  { to: '/finance/invoices', label: 'Facturas', icon: Receipt, roles: ['ceo'] },
  { to: '/close-year', label: 'Cierre de Año', icon: Trophy, roles: ['ceo'] },

  // ── Docente ──
  { to: '/my-courses', label: 'Mis cursos', icon: BookOpen, roles: ['docente'] },
  { to: '/my-sections', label: 'Asistencias', icon: CalendarCheck, roles: ['docente'] },
  { to: '/students', label: 'Estudiantes', icon: Users, roles: ['docente'] },

  // ── Estudiante ──
  { to: '/my-grades', label: 'Mis notas', icon: Award, roles: ['estudiante'] },
  { to: '/my-attendance', label: 'Mi asistencia', icon: CalendarCheck, roles: ['estudiante'] },
  { to: '/my-courses-student', label: 'Mis cursos', icon: BookOpen, roles: ['estudiante'] },

  // ── Padre ──
  { to: '/my-children', label: 'Mis hijos', icon: Users, roles: ['padre'] },
  { to: '/my-invoices', label: 'Mis pagos', icon: Receipt, roles: ['padre'] },

  // ── Todos ──
  { to: '/my-profile', label: 'Mi perfil', icon: UserCircle, roles: ['ceo', 'docente', 'estudiante', 'padre'] },
];

export const Sidebar = () => {
  const role = useAuthStore((s) => s.role);
  const tenant = useAuthStore((s) => s.tenant);

  const visibleItems = menuItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* ── LOGO VIOEDUCA ── */}
      <div className="h-20 flex items-center px-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          
          {/* AQUÍ VA LA IMAGEN */}
          <img 
            src={logoVioeduca} 
            alt="Vioeduca Logo" 
            className="w-10 h-10 object-contain rounded-xl" 
          />
          
          {/* Textos */}
          <div className="flex flex-col">
            <span className="font-extrabold text-gray-900 text-xl leading-tight tracking-tight">
              Vioeduca
            </span>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate max-w-[120px]">
              {tenant?.subdomain || 'Colegio'}
            </span>
          </div>

        </div>
      </div>

      {/* ── MENÚ ── */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.to}-${idx}`}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                  {item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* ── FOOTER DEL SIDEBAR ── */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
        <span>Vioeduca</span>
        <span>v1.0.0</span>
      </div>
    </aside>
  );
};