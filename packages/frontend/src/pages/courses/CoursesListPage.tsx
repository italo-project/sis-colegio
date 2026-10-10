import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertTriangle, BookOpen } from 'lucide-react';
import { coursesApi } from '@/api/courses.api';
import { Button } from '@/components/ui/Button';
import { StatusFilter, type FilterValue } from '@/components/ui/StatusFilter';
import { CourseFormModal } from './CourseFormModal.tsx';
import { getErrorMessage } from '@/api/client';
import { formatCourse } from '@/lib/format';
import { AutoGenerateCoursesModal } from './AutoGenerateCoursesModal';

import type { Course } from '@/types/course';

export const CoursesListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterValue>('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAutoGenOpen, setIsAutoGenOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const activeParam: 'true' | 'false' | undefined =
    statusFilter === 'active' ? 'true' : statusFilter === 'inactive' ? 'false' : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['courses', statusFilter],
    queryFn: () =>
      coursesApi.list({
        active: activeParam,
        limit: 200,
        offset: 0,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: coursesApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setToast({ type: 'success', msg: 'Curso desactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: coursesApi.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setToast({ type: 'success', msg: 'Curso reactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: coursesApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setToast({ type: 'success', msg: 'Curso eliminado definitivamente' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const filteredCourses =
    data?.items.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.subject.name.toLowerCase().includes(q) ||
        c.subject.code.toLowerCase().includes(q) ||
        c.section.name.toLowerCase().includes(q) ||
        c.section.gradeLevel?.name.toLowerCase().includes(q) ||
        (c.teacher?.fullName ?? '').toLowerCase().includes(q)
      );
    }) ?? [];

  const handleEdit = (course: Course) => {
    setEditing(course);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditing(null);
  };

  const handleDeactivate = (course: Course) => {
    const label = `${course.subject.name} ${course.section.gradeLevel?.name ?? ''} "${course.section.name}"`;
    if (confirm(`¿Desactivar el curso ${label}?\n\nNo se eliminará, solo quedará inactivo.`)) {
      deactivateMutation.mutate(course.id);
    }
  };

  const handleReactivate = (course: Course) => {
    if (confirm(`¿Reactivar este curso?`)) {
      reactivateMutation.mutate(course.id);
    }
  };

  const handleHardDelete = async (course: Course) => {
    try {
      const detail = await coursesApi.getById(course.id);

      if (!detail.canBeDeleted) {
        const bd = detail.relatedBreakdown;
        const detalles: string[] = [];
        if (bd?.enrollments) detalles.push(`${bd.enrollments} matrícula(s)`);
        if (bd?.gradeCategories) detalles.push(`${bd.gradeCategories} categoría(s) de evaluación`);

        alert(
          `No se puede eliminar este curso.\n\n` +
            `Tiene datos asociados:\n• ${detalles.join('\n• ')}\n\n` +
            `Solución: desactívalo en lugar de eliminarlo.`,
        );
        return;
      }

      if (confirm(`¿Eliminar DEFINITIVAMENTE este curso?\n\nEsta acción NO se puede deshacer.`)) {
        hardDeleteMutation.mutate(course.id);
      }
    } catch (err) {
      alert(getErrorMessage(err));
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
          <h1 className="text-2xl font-bold text-gray-900">Cursos</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} curso{data?.total === 1 ? '' : 's'} registrado
            {data?.total === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
  <Button
    variant="secondary"
    onClick={handleCreate}
    icon={<Plus className="w-4 h-4" />}
  >
    Crear uno
  </Button>
  <Button
    onClick={() => setIsAutoGenOpen(true)}
    icon={<BookOpen className="w-4 h-4" />}
  >
    Auto-generar
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
              placeholder="Buscar por asignatura, sección o docente..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : filteredCourses.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay cursos que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Curso</th>
                  <th className="text-left font-medium px-4 py-3">Año</th>
                  <th className="text-left font-medium px-4 py-3">Docente</th>
                  <th className="text-left font-medium px-4 py-3">Horas/sem</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
  <div className="font-medium text-gray-900">
    {formatCourse(course)}
  </div>
</td>
                    <td className="px-4 py-3 text-gray-600">{course.academicYear.year}</td>
                    <td className="px-4 py-3 text-gray-600">
  {course.teacher
    ? course.teacher.fullName
    : <span className="text-yellow-600 text-xs">Sin asignar</span>}
</td>
                    <td className="px-4 py-3 text-gray-600">{course.weeklyHours ?? '—'}</td>
                    <td className="px-4 py-3">
                      {course.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(course)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {course.isActive ? (
                          <button
                            onClick={() => handleDeactivate(course)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReactivate(course)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDelete(course)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CourseFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        course={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['courses'] });
          setToast({
            type: 'success',
            msg: editing ? 'Curso actualizado' : 'Curso creado',
          });
          handleCloseForm();
        }}
      />
      <AutoGenerateCoursesModal
  open={isAutoGenOpen}
  onClose={() => setIsAutoGenOpen(false)}
  onSuccess={() => {
    queryClient.invalidateQueries({ queryKey: ['courses'] });
    setToast({ type: 'success', msg: 'Cursos generados' });
  }}
/>
    </div>
  );
};