import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, ArrowRight } from 'lucide-react';
import { apiClient } from '@/api/client';
import { StatCard, Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';
import type { Course } from '@/types/course';

export const TeacherDashboardPage = () => {
  const user = useAuthStore((s) => s.user);

  const { data: courses } = useQuery({
    queryKey: ['teacher-dashboard-courses'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Course[]; total: number }>('/me/courses');
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.fullName}</h1>
        <p className="text-sm text-gray-500 mt-1">Aquí está el resumen de tus cursos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Mis cursos"
          value={courses?.total ?? '—'}
          icon={<BookOpen className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Este mes"
          value="—"
          icon={<Award className="w-5 h-5" />}
          color="green"
          subtitle="Notas registradas"
        />
        <StatCard
          title="Asistencias"
          value="—"
          icon={<Users className="w-5 h-5" />}
          color="purple"
          subtitle="Tomadas este mes"
        />
      </div>

      <Card title="Mis cursos">
        {!courses || courses.items.length === 0 ? (
          <p className="text-sm text-gray-500">No tienes cursos asignados.</p>
        ) : (
          <div className="space-y-2">
            {courses.items.map((c) => (
              <Link
                key={c.id}
                to={`/my-courses/${c.id}/grades`}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900">{c.subject.name}</div>
                  <div className="text-xs text-gray-500">
                    {c.section.gradeLevel?.name} "{c.section.name}" · {c.academicYear.year}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};