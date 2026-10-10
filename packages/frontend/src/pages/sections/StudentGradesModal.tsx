import { useQuery } from '@tanstack/react-query';
import { Award, User, BookOpen } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { gradesApi } from '@/api/grades.api';
import { Card } from '@/components/ui/Card';
import { formatCourse } from '@/lib/format';
import { formatDateShort } from '@/lib/dates';

type Props = {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  studentName?: string;
};

export const StudentGradesModal = ({ open, onClose, studentId, studentName }: Props) => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['student-report', studentId],
    queryFn: () => gradesApi.getStudentReport(studentId!),
    enabled: open && !!studentId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Boletín de notas${studentName ? ` — ${studentName}` : ''}`}
      size="2xl"
      footer={
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
        >
          Cerrar
        </button>
      }
    >
      {isLoading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Cargando boletín...</div>
      ) : isError ? (
        <div className="p-12 text-center text-red-600 text-sm">
          {error instanceof Error ? error.message : 'Error al cargar el boletín'}
        </div>
      ) : !data ? (
        <div className="p-12 text-center text-gray-500 text-sm">Sin datos</div>
      ) : (
        <div className="space-y-5">
          {/* Cabecera del alumno */}
          <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <User className="w-7 h-7" />
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">{data.student.fullName}</div>
              <div className="text-sm text-gray-500">DNI {data.student.dni}</div>
            </div>
          </div>

          {data.courses.length === 0 ? (
            <div className="p-12 text-center text-gray-500 text-sm bg-gray-50 rounded-xl">
              Este estudiante no tiene cursos con notas registradas.
            </div>
          ) : (
            <>
              {/* Resumen general */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Cursos</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.courses.length}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Promedio general</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const withAvg = data.courses.filter(
                        (c) => c.averages.finalAverage !== null,
                      );
                      if (withAvg.length === 0) return '—';
                      const sum = withAvg.reduce(
                        (s, c) => s + (c.averages.finalAverage ?? 0),
                        0,
                      );
                      return (sum / withAvg.length).toFixed(2);
                    })()}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500">Evaluaciones</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {data.courses.reduce((s, c) => s + c.entries.length, 0)}
                  </div>
                </div>
              </div>

              {/* Detalle por curso */}
              {data.courses.map((c) => (
                <Card
                  key={c.course.id}
                  title={formatCourse({
                    subject: c.course.subject,
                    section: {
                      name: c.course.section.name,
                      gradeLevel: c.course.gradeLevel,
                    },
                    academicYear: c.course.academicYear,
                  })}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
                      <span className="text-gray-500 flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        Docente: {c.course.teacher?.fullName ?? 'Sin asignar'}
                      </span>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
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
                            <div className="text-xs text-gray-400">
                              Peso: {cat.categoryWeight}%
                            </div>
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
                              <th className="text-right font-medium px-4 py-2">Peso</th>
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
                                <td className="px-4 py-2 text-right text-gray-600">
                                  {e.evaluationWeight}%
                                </td>
                                <td className="px-4 py-2 text-right font-bold text-gray-900">
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
              ))}
            </>
          )}
        </div>
      )}
    </Modal>
  );
};