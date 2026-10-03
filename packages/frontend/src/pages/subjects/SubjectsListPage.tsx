import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { subjectsApi } from '@/api/subjects.api';
import { Button } from '@/components/ui/Button';
import { SubjectFormModal } from './SubjectFormModal';
import { getErrorMessage } from '@/api/client';
import type { Subject } from '@/types/subject';

export const SubjectsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subjects', search, activeOnly],
    queryFn: () =>
      subjectsApi.list({
        q: search || undefined,
        active: activeOnly ? 'true' : undefined,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: subjectsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setToast({ type: 'success', msg: 'Asignatura desactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: subjectsApi.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setToast({ type: 'success', msg: 'Asignatura reactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: subjectsApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      setToast({ type: 'success', msg: 'Asignatura eliminada definitivamente' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleEdit = (subject: Subject) => {
    setEditing(subject);
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

  const handleDeactivate = (subject: Subject) => {
    if (
      confirm(
        `¿Desactivar la asignatura ${subject.name}?\n\nNo se eliminará, solo quedará inactiva.`,
      )
    ) {
      deactivateMutation.mutate(subject.id);
    }
  };

  const handleReactivate = (subject: Subject) => {
    if (confirm(`¿Reactivar la asignatura ${subject.name}?`)) {
      reactivateMutation.mutate(subject.id);
    }
  };

  const handleHardDelete = async (subject: Subject) => {
    try {
      const detail = await subjectsApi.getById(subject.id);

      if (!detail.canBeDeleted) {
        const bd = detail.relatedBreakdown;
        const detalles: string[] = [];
        if (bd?.courses) detalles.push(`${bd.courses} curso(s) asociado(s)`);

        alert(
          `No se puede eliminar la asignatura ${subject.name}.\n\n` +
            `Tiene datos asociados:\n• ${detalles.join('\n• ')}\n\n` +
            `Solución: desactívala en lugar de eliminarla.`,
        );
        return;
      }

      if (
        confirm(
          `¿Eliminar DEFINITIVAMENTE la asignatura ${subject.name}?\n\n` +
            `Esta acción NO se puede deshacer.`,
        )
      ) {
        hardDeleteMutation.mutate(subject.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Asignaturas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} asignatura{data?.total === 1 ? '' : 's'} registrada
            {data?.total === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>
          Nueva asignatura
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            Solo activas
          </label>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay asignaturas que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Código</th>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3">Área</th>
                  <th className="text-left font-medium px-4 py-3">Descripción</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((subject) => (
                  <tr key={subject.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">
                      {subject.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{subject.name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{subject.area ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {subject.description ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {subject.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Inactiva
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(subject)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {subject.isActive ? (
                          <button
                            onClick={() => handleDeactivate(subject)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReactivate(subject)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDelete(subject)}
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

      <SubjectFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        subject={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          setToast({
            type: 'success',
            msg: editing ? 'Asignatura actualizada' : 'Asignatura creada',
          });
          handleCloseForm();
        }}
      />
    </div>
  );
};