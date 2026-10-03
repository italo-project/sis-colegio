import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BookOpen, Award } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { Card } from '@/components/ui/Card';

export const StudentMyCoursesPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['my-courses-student'],
    queryFn: meApi.getMyCourses,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando cursos...</div>;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          Aún no estás matriculado en ningún curso.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis cursos</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.total} curso{data.total === 1 ? '' : 's'} en los que estás matriculado
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.items.map((enrollment) => (
          <div
            key={enrollment.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-primary-50 to-white">
              <div className="flex items-start justify-between mb-2">
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-primary-100 text-primary-700">
                  {enrollment.course.subject.code}
                </span>
                <span className="text-xs text-gray-500">
                  {enrollment.course.academicYear.year}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                {enrollment.course.subject.name}
              </h3>
              {enrollment.course.gradeLevel && (
                <p className="text-sm text-gray-600 mt-1">
                  {enrollment.course.gradeLevel.name} "{enrollment.course.section.name}"
                </p>
              )}
            </div>
            <div className="p-4">
              <div className="text-xs text-gray-500 mb-1">Docente</div>
              <div className="text-sm font-medium text-gray-900">
                {enrollment.course.teacher.firstName} {enrollment.course.teacher.lastName}
              </div>
              <Link
                to="/my-grades"
                className="mt-3 flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Award className="w-4 h-4" />
                Ver mis notas
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};