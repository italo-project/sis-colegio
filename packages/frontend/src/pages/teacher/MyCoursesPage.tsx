import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Users, Award, CalendarCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/api/client';
import type { Course } from '@/types/course';

export const MyCoursesPage = () => {
  const role = useAuthStore((s) => s.role);

  const { data, isLoading } = useQuery({
    queryKey: ['my-courses'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Course[]; total: number }>('/me/courses');
      return data;
    },
  });

  if (role !== 'docente') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
        Esta sección solo está disponible para docentes.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis cursos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.total ?? 0} curso{data?.total === 1 ? '' : 's'} que impartes
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 text-sm">
          Aún no tienes cursos asignados. Contacta al administrador del colegio.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.items.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-primary-300 transition-colors overflow-hidden"
            >
              <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-primary-50 to-white">
                <div className="flex items-start justify-between mb-2">
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700">
                    {course.subject.code}
                  </span>
                  <span className="text-xs text-gray-500">{course.academicYear.year}</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{course.subject.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {course.section.gradeLevel?.name} "{course.section.name}"
                </p>
              </div>

              <div className="p-5 flex flex-col gap-2">
                <Link
                  to={`/my-courses/${course.id}/grades`}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Award className="w-4 h-4" />
                  Gestionar notas
                </Link>
                <Link
                  to={`/my-courses/${course.id}/attendance`}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <CalendarCheck className="w-4 h-4" />
                  Ver asistencias de la sección
                </Link>
                <Link
                  to={`/my-courses/${course.id}/students`}
                  className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  <Users className="w-4 h-4" />
                  Ver estudiantes
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};