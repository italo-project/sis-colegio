import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, History, Award } from 'lucide-react';
import { studentsApi } from '@/api/students.api';
import { formatDateEs } from '@/lib/dates';

export const StudentHistoryPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['student-section-history', id],
    queryFn: () => studentsApi.getSectionHistory(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando historial...</div>;
  }

  if (!data) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">
        Historial no encontrado
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/students"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Estudiantes
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Historial académico
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {data.student.fullName} · DNI {data.student.dni}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Este estudiante aún no tiene historial de secciones.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              Secciones cursadas ({data.total})
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Ordenado de la más reciente a la más antigua
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Sección</th>
                  <th className="text-left font-medium px-4 py-3">Año</th>
                  <th className="text-left font-medium px-4 py-3">Desde</th>
                  <th className="text-left font-medium px-4 py-3">Hasta</th>
                  <th className="text-right font-medium px-4 py-3">Promedio</th>
                  <th className="text-left font-medium px-4 py-3">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-gray-900">
                          {item.gradeLevel.name} "{item.sectionName}"
                        </div>
                        {item.isCurrent && (
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            Actual
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.academicYear.year}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {formatDateEs(item.enrolledAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.leftAt ? (
                        formatDateEs(item.leftAt)
                      ) : (
                        <span className="text-blue-600 font-medium">En curso</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.averageAtExit !== null ? (
                        <span className="inline-flex items-center gap-1 font-bold text-gray-900">
                          <Award className="w-4 h-4 text-yellow-500" />
                          {item.averageAtExit.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                      {item.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <strong>Nota:</strong> el "Promedio" es el promedio general del estudiante
        al momento de salir de esa sección. Solo se muestran los promedios finales,
        no las notas individuales.
      </div>
    </div>
  );
};