import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { StudentDashboardPage } from './student/StudentDashboardPage';
import { ParentDashboardPage } from './parent/ParentDashboardPage';
import { CeoDashboardPage } from './ceo/CeoDashboardPage';
import { TeacherDashboardPage } from './teacher/TeacherDashboardPage';

export const DashboardPage = () => {
  const role = useAuthStore((s) => s.role);

  if (role === 'estudiante') return <StudentDashboardPage />;
  if (role === 'padre') return <ParentDashboardPage />;
  if (role === 'docente') return <TeacherDashboardPage />;
  if (role === 'ceo') return <CeoDashboardPage />;

  return <Navigate to="/login" replace />;
};