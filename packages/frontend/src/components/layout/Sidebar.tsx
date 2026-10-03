import { NavLink } from 'react-router-dom';
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

type MenuItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
};

const menuItems: MenuItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['ceo', 'docente', 'estudiante', 'padre'],
  },

  // CEO
  {
    to: '/students',
    label: 'Estudiantes',
    icon: Users,
    roles: ['ceo'],
  },
  {
    to: '/teachers',
    label: 'Docentes',
    icon: GraduationCap,
    roles: ['ceo'],
  },
  {
    to: '/parents',
    label: 'Padres',
    icon: UserCog,
    roles: ['ceo'],
  },
  {
    to: '/subjects',
    label: 'Asignaturas',
    icon: BookOpen,
    roles: ['ceo'],
  },
  {
    to: '/courses',
    label: 'Cursos',
    icon: Calendar,
    roles: ['ceo'],
  },
  {
    to: '/sections',
    label: 'Secciones',
    icon: Layers,
    roles: ['ceo'],
  },
  {
    to: '/enrollments',
    label: 'Matrículas',
    icon: UserPlus,
    roles: ['ceo'],
  },
  {
    to: '/finance',
    label: 'Finanzas',
    icon: DollarSign,
    roles: ['ceo'],
  },
  {
    to: '/finance/concepts',
    label: 'Conceptos de cobro',
    icon: FileText,
    roles: ['ceo'],
  },
  {
    to: '/finance/invoices',
    label: 'Facturas',
    icon: Receipt,
    roles: ['ceo'],
  },

  // Docente
  {
    to: '/my-courses',
    label: 'Mis cursos',
    icon: BookOpen,
    roles: ['docente'],
  },
  {
    to: '/students',
    label: 'Estudiantes',
    icon: Users,
    roles: ['docente'],
  },

  // Estudiante
  {
    to: '/my-grades',
    label: 'Mis notas',
    icon: Award,
    roles: ['estudiante'],
  },
  {
    to: '/my-attendance',
    label: 'Mi asistencia',
    icon: CalendarCheck,
    roles: ['estudiante'],
  },
  {
    to: '/my-courses-student',
    label: 'Mis cursos',
    icon: BookOpen,
    roles: ['estudiante'],
  },

  // Padre
  {
    to: '/my-children',
    label: 'Mis hijos',
    icon: Users,
    roles: ['padre'],
  },
  {
    to: '/my-invoices',
    label: 'Mis pagos',
    icon: Receipt,
    roles: ['padre'],
  },
];

export const Sidebar = () => {
  const role = useAuthStore((s) => s.role);

  const visibleItems = menuItems.filter((item) => role && item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={`${item.to}-${idx}`}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-100 text-xs text-gray-400">v0.1.0</div>
    </aside>
  );
};