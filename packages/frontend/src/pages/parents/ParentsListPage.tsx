import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertTriangle } from 'lucide-react';
import { parentsApi } from '@/api/parents.api';
import { Button } from '@/components/ui/Button';
import { ParentFormModal } from './ParentFormModal';
import { getErrorMessage } from '@/api/client';
import type { Parent } from '@/types/parent';

export const ParentsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['parents', search, activeOnly],
    queryFn: () =>
      parentsApi.list({
        q: search || undefined,
        active: activeOnly ? 'true' : undefined,
        limit: 100,
        offset: 0,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: parentsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setToast({ type: 'success', msg: 'Padre desactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: parentsApi.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setToast({ type: 'success', msg: 'Padre reactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: parentsApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents'] });
      setToast({ type: 'success', msg: 'Padre eliminado definitivamente' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleEdit = (parent: Parent) => {
    setEditing(parent);
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

  const handleDeactivate = (parent: Parent) => {
    if (
      confirm(
        `¿Desactivar a ${parent.firstName} ${parent.lastName}?\n\nNo se eliminará, solo quedará inactivo.`,
      )
    ) {
      deactivateMutation.mutate(parent.id);
    }
  };

  const handleReactivate = (parent: Parent) => {
    if (confirm(`¿Reactivar a ${parent.firstName} ${parent.lastName}?`)) {
      reactivateMutation.mutate(parent.id);
    }
  };

  const handleHardDelete = async (parent: Parent) => {
    try {
      const detail = await parentsApi.getById(parent.id);

      if (!detail.canBeDeleted) {
        const bd = detail.relatedBreakdown;
        const detalles: string[] = [];
        if (bd?.students) detalles.push(`${bd.students} hijo(s) vinculado(s)`);

        alert(
          `No se puede eliminar a ${parent.firstName} ${parent.lastName}.\n\n` +
            `Tiene datos asociados:\n• ${detalles.join('\n• ')}\n\n` +
            `Solución: desactívalo en lugar de eliminarlo.`,
        );
        return;
      }

      if (
        confirm(
          `¿Eliminar DEFINITIVAMENTE a ${parent.firstName} ${parent.lastName}?\n\n` +
            `Esta acción NO se puede deshacer.`,
        )
      ) {
        hardDeleteMutation.mutate(parent.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Padres / Apoderados</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} padre{data?.total === 1 ? '' : 's'} registrado
            {data?.total === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>
          Nuevo padre
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
              placeholder="Buscar por nombre, DNI o email..."
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
            Solo activos
          </label>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay padres que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-left font-medium px-4 py-3">DNI</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Teléfono</th>
                  <th className="text-left font-medium px-4 py-3">Ocupación</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((parent) => (
                  <tr key={parent.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {parent.lastName}, {parent.firstName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{parent.dni}</td>
                    <td className="px-4 py-3 text-gray-600">{parent.email}</td>
                    <td className="px-4 py-3 text-gray-600">{parent.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{parent.occupation ?? '—'}</td>
                    <td className="px-4 py-3">
                      {parent.isActive ? (
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
                          onClick={() => handleEdit(parent)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {parent.isActive ? (
                          <button
                            onClick={() => handleDeactivate(parent)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReactivate(parent)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDelete(parent)}
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

      <ParentFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        parent={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['parents'] });
          setToast({
            type: 'success',
            msg: editing ? 'Padre actualizado' : 'Padre creado',
          });
          handleCloseForm();
        }}
      />
    </div>
  );
};