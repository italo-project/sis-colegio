import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { StatCard } from '@/components/ui/Card';
import { formatDateEs } from '@/lib/dates';

const statusLabels: Record<string, string> = {
  present: 'Asistió',
  late: 'Tardanza',
  absent: 'Faltó',
};

const statusColors: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-700',
  absent: 'bg-red-100 text-red-700',
};

export const ChildAttendancePage = () => {
  const { childId } = useParams<{ childId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['child-attendance', childId],
    queryFn: () => meApi.getChildAttendance(childId!),
    enabled: !!childId,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-gray-500 text-sm">Sin datos</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/my-children"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Mis hijos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Asistencia de {data.student.firstName} {data.student.lastName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Historial del año escolar</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Sesiones"
          value={data.summary.totalSessions}
          icon={<CalendarCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Asistencias"
          value={data.summary.present}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Tardanzas"
          value={data.summary.late}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Faltas"
          value={data.summary.absent}
          icon={<XCircle className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {data.summary.attendanceRate !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Tasa de asistencia</span>
            <span className="text-2xl font-bold text-gray-900">
              {data.summary.attendanceRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                data.summary.attendanceRate >= 90
                  ? 'bg-green-500'
                  : data.summary.attendanceRate >= 75
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(data.summary.attendanceRate, 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Historial detallado</h3>
        </div>
        {data.history.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay sesiones registradas aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Fecha</th>
                  <th className="text-left font-medium px-4 py-2">Sección</th>
                  <th className="text-left font-medium px-4 py-2">Tema</th>
                  <th className="text-left font-medium px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.history.map((item) => (
                  <tr key={item.sessionId} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {formatDateEs(item.sessionDate)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {item.section.gradeLevel.name} "{item.section.name}"
                    </td>
                    <td className="px-4 py-2 text-gray-600">{item.topic ?? '—'}</td>
                    <td className="px-4 py-2">
                      {item.record ? (
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.record.status]}`}
                        >
                          {statusLabels[item.record.status]}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Sin marcar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};