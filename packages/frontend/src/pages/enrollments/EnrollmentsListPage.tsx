import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { enrollmentsApi } from '@/api/enrollments.api';
import { coursesApi } from '@/api/courses.api';
import { Button } from '@/components/ui/Button';
import { EnrollmentFormModal } from './EnrollmentFormModal';
import { BulkEnrollModal } from './BulkEnrollModal';
import { getErrorMessage } from '@/api/client';
import { formatCourse } from '@/lib/format';
import type { Enrollment } from '@/types/enrollment';

export const EnrollmentsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: courses } = useQuery({
    queryKey: ['courses-for-enrollments'],
    queryFn: () => coursesApi.list({ active: 'true', limit: 200, offset: 0 }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['enrollments', courseFilter],
    queryFn: () =>
      enrollmentsApi.list({
        courseId: courseFilter || undefined,
        status: 'active',
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: enrollmentsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      setToast({ type: 'success', msg: 'Matrícula eliminada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const filtered =
    data?.items.filter((e) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        `${e.student.firstName} ${e.student.lastName}`.toLowerCase().includes(q) ||
        e.student.dni.toLowerCase().includes(q) ||
        e.course.subject.name.toLowerCase().includes(q)
      );
    }) ?? [];

  const handleDelete = (enrollment: Enrollment) => {
    const label = `${enrollment.student.lastName}, ${enrollment.student.firstName} en ${enrollment.course.subject.name}`;
    if (
      confirm(
        `¿Retirar la matrícula de ${label}?\n\nSe eliminarán las notas y asistencias registradas para este estudiante en este curso.`,
      )
    ) {
      deleteMutation.mutate(enrollment.id);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matrículas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} matrícula{filtered.length === 1 ? '' : 's'} activa
            {filtered.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsBulkOpen(true)}
            icon={<Layers className="w-4 h-4" />}
          >
            Matricular sección
          </Button>
          <Button onClick={() => setIsFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Nueva matrícula
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por estudiante o asignatura..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          >
            <option value="">Todos los cursos</option>
            {courses?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subject.name} — {c.section.gradeLevel?.name} "{c.section.name}"
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay matrículas que coincidan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Estudiante</th>
                  <th className="text-left font-medium px-4 py-3">DNI</th>
                  <th className="text-left font-medium px-4 py-3">Curso</th>
                  <th className="text-left font-medium px-4 py-3">Docente</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {enrollment.student.lastName}, {enrollment.student.firstName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{enrollment.student.dni}</td>
                    <td className="px-4 py-3">
  <div className="font-medium text-gray-900">
    {formatCourse({
      subject: enrollment.course.subject,
      section: enrollment.course.section,
      academicYear: enrollment.course.academicYear,
    })}
  </div>
</td>
                    <td className="px-4 py-3 text-gray-600">
                      {enrollment.course.teacher.lastName}, {enrollment.course.teacher.firstName}
                    </td>
                    <td className="px-4 py-3">
                      {enrollment.status === 'active' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activa
                        </span>
                      )}
                      {enrollment.status === 'withdrawn' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Retirada
                        </span>
                      )}
                      {enrollment.status === 'completed' && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Completada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(enrollment)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Retirar matrícula"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EnrollmentFormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
          setToast({ type: 'success', msg: 'Estudiante matriculado' });
          setIsFormOpen(false);
        }}
      />

      <BulkEnrollModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={(count) => {
          queryClient.invalidateQueries({ queryKey: ['enrollments'] });
          setToast({
            type: 'success',
            msg: `${count} estudiante${count === 1 ? '' : 's'} matriculado${count === 1 ? '' : 's'}`,
          });
          setIsBulkOpen(false);
        }}
      />
    </div>
  );
};