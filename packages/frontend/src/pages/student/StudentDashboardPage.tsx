import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Award, CalendarCheck, BookOpen, ArrowRight } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { StatCard, Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';

export const StudentDashboardPage = () => {
  const user = useAuthStore((s) => s.user);

  const { data: grades } = useQuery({
    queryKey: ['my-grades'],
    queryFn: meApi.getMyGrades,
  });

  const { data: attendance } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: meApi.getMyAttendance,
  });

  const coursesWithGrades = grades?.courses.filter((c) => c.averages.finalAverage !== null) ?? [];
  const avgGeneral =
    coursesWithGrades.length > 0
      ? coursesWithGrades.reduce((sum, c) => sum + (c.averages.finalAverage ?? 0), 0) /
        coursesWithGrades.length
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.fullName}</h1>
        <p className="text-sm text-gray-500 mt-1">Aquí está tu resumen académico.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mis cursos"
          value={grades?.courses.length ?? '—'}
          icon={<BookOpen className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Promedio general"
          value={avgGeneral !== null ? avgGeneral.toFixed(2) : '—'}
          icon={<Award className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Asistencia"
          value={
            attendance?.summary.attendanceRate !== null &&
            attendance?.summary.attendanceRate !== undefined
              ? `${attendance.summary.attendanceRate.toFixed(1)}%`
              : '—'
          }
          icon={<CalendarCheck className="w-5 h-5" />}
          color="purple"
          subtitle={
            attendance
              ? `${attendance.summary.present} asistió · ${attendance.summary.absent} faltó`
              : undefined
          }
        />
        <StatCard
          title="Tardanzas"
          value={attendance?.summary.late ?? '—'}
          icon={<CalendarCheck className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Acciones rápidas">
          <div className="space-y-2">
            <Link
              to="/my-grades"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Ver mis notas</div>
                  <div className="text-xs text-gray-500">Por curso y evaluación</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/my-attendance"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <CalendarCheck className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Ver mi asistencia</div>
                  <div className="text-xs text-gray-500">
                    Historial de asistencia del año
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </Card>

        <Card title="Notas recientes">
          {grades?.courses.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no tienes notas registradas.</p>
          ) : (
            <div className="space-y-3">
              {grades?.courses.slice(0, 5).map((c) => (
                <div key={c.course.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{c.course.subject.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.course.gradeLevel.name} "{c.course.section.name}"
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {c.averages.finalAverage !== null
                      ? c.averages.finalAverage.toFixed(2)
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};