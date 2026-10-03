import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Trash2, RotateCcw, AlertTriangle, UserCog } from 'lucide-react';
import { sectionsApi } from '@/api/sections.api';
import { Button } from '@/components/ui/Button';
import { SectionFormModal } from './SectionFormModal';
import { AssignTutorModal } from './AssignTutorModal';
import { getErrorMessage } from '@/api/client';
import type { Section } from '@/types/section';

export const SectionsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Section | null>(null);
  const [tutorFor, setTutorFor] = useState<Section | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sections', activeOnly],
    queryFn: () =>
      sectionsApi.list({
        active: activeOnly ? 'true' : undefined,
      }),
  });

  const deactivateMutation = useMutation({
    mutationFn: sectionsApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setToast({ type: 'success', msg: 'Sección desactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: sectionsApi.reactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setToast({ type: 'success', msg: 'Sección reactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: sectionsApi.hardDelete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      setToast({ type: 'success', msg: 'Sección eliminada definitivamente' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const filteredSections =
    data?.filter((s) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q);
    }) ?? [];

  const handleEdit = (section: Section) => {
    setEditing(section);
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

  const handleDeactivate = (section: Section) => {
    if (confirm(`¿Desactivar la sección "${section.name}"?`)) {
      deactivateMutation.mutate(section.id);
    }
  };

  const handleReactivate = (section: Section) => {
    if (confirm(`¿Reactivar la sección "${section.name}"?`)) {
      reactivateMutation.mutate(section.id);
    }
  };

  const handleHardDelete = async (section: Section) => {
    try {
      const detail = await sectionsApi.getById(section.id);

      if (!detail.canBeDeleted) {
        const bd = detail.relatedBreakdown;
        const detalles: string[] = [];
        if (bd?.courses) detalles.push(`${bd.courses} curso(s)`);
        if (bd?.enrollments) detalles.push(`${bd.enrollments} matrícula(s)`);

        alert(
          `No se puede eliminar la sección "${section.name}".\n\n` +
            `Tiene datos asociados:\n• ${detalles.join('\n• ')}\n\n` +
            `Solución: desactívala en lugar de eliminarla.`,
        );
        return;
      }

      if (confirm(`¿Eliminar DEFINITIVAMENTE la sección "${section.name}"?`)) {
        hardDeleteMutation.mutate(section.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Secciones</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filteredSections.length} sección{filteredSections.length === 1 ? '' : 'es'} registrada
            {filteredSections.length === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>
          Nueva sección
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
              placeholder="Buscar por nombre..."
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
        ) : filteredSections.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay secciones registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Sección</th>
                  <th className="text-left font-medium px-4 py-3">Capacidad</th>
                  <th className="text-left font-medium px-4 py-3">Tutor</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSections.map((section) => (
                  <tr key={section.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">"{section.name}"</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{section.capacity ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {section.tutorUserId ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Asignado
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                          Sin tutor
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {section.isActive ? (
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
                          onClick={() => setTutorFor(section)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Asignar tutor"
                        >
                          <UserCog className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(section)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {section.isActive ? (
                          <button
                            onClick={() => handleDeactivate(section)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleReactivate(section)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Reactivar"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleHardDelete(section)}
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

      <SectionFormModal
        open={isFormOpen}
        onClose={handleCloseForm}
        section={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['sections'] });
          setToast({
            type: 'success',
            msg: editing ? 'Sección actualizada' : 'Sección creada',
          });
          handleCloseForm();
        }}
      />

      <AssignTutorModal
        open={!!tutorFor}
        onClose={() => setTutorFor(null)}
        section={tutorFor}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['sections'] });
          setToast({ type: 'success', msg: 'Tutor asignado' });
          setTutorFor(null);
        }}
      />
    </div>
  );
};