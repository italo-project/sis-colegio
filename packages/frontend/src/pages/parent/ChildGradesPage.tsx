import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { Card } from '@/components/ui/Card';
import { formatCourse } from '@/lib/format';
import { formatDateShort } from '@/lib/dates';

export const ChildGradesPage = () => {
  const { childId } = useParams<{ childId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['child-grades', childId],
    queryFn: () => meApi.getChildGrades(childId!),
    enabled: !!childId,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando notas...</div>;
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
          Notas de {data?.student.fullName}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Notas por curso</p>
      </div>

      {!data || data.courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            Este estudiante no tiene notas registradas aún.
          </p>
        </div>
      ) : (
        data.courses.map((c) => (
          <Card
            key={c.course.id}
            title={formatCourse({
              subject: c.course.subject,
              section: { name: c.course.section.name, gradeLevel: c.course.gradeLevel },
              academicYear: c.course.academicYear,
            })}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
                <span className="text-gray-500">
                  Docente: {c.course.teacher ? c.course.teacher.fullName : 'Sin asignar'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Promedio final:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {c.averages.finalAverage !== null
                      ? c.averages.finalAverage.toFixed(2)
                      : '—'}
                  </span>
                </div>
              </div>

              {c.averages.categories.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {c.averages.categories.map((cat) => (
                    <div key={cat.categoryId} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500">{cat.categoryName}</div>
                      <div className="text-lg font-bold text-gray-900">
                        {cat.average !== null ? cat.average.toFixed(2) : '—'}
                      </div>
                      <div className="text-xs text-gray-400">Peso: {cat.categoryWeight}%</div>
                    </div>
                  ))}
                </div>
              )}

              {c.entries.length > 0 && (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-medium px-4 py-2">Evaluación</th>
                        <th className="text-left font-medium px-4 py-2">Categoría</th>
                        <th className="text-left font-medium px-4 py-2">Fecha</th>
                        <th className="text-right font-medium px-4 py-2">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {c.entries.map((e) => (
                        <tr key={e.id}>
                          <td className="px-4 py-2 font-medium text-gray-900">
                            {e.evaluationName}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{e.categoryName}</td>
                          <td className="px-4 py-2 text-gray-600">
                            {e.evaluationDate ? formatDateShort(e.evaluationDate) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-bold">
                            {e.score !== null
                              ? `${e.score} / ${e.evaluationMaxScore}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
};