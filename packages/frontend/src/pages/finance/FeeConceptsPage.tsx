import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { financeApi } from '@/api/finance.api';
import { Button } from '@/components/ui/Button';
import { FeeConceptFormModal } from './FeeConceptFormModal';
import { getErrorMessage } from '@/api/client';
import type { FeeConcept } from '@/types/finance';

export const FeeConceptsPage = () => {
  const queryClient = useQueryClient();
  const [activeOnly, setActiveOnly] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeConcept | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fee-concepts', activeOnly],
    queryFn: () => financeApi.listConcepts({ active: activeOnly ? 'true' : undefined }),
  });

  const deactivateMutation = useMutation({
    mutationFn: financeApi.deactivateConcept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-concepts'] });
      setToast({ type: 'success', msg: 'Concepto desactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleEdit = (concept: FeeConcept) => {
    setEditing(concept);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleDeactivate = (concept: FeeConcept) => {
    if (confirm(`¿Desactivar el concepto ${concept.name}?`)) {
      deactivateMutation.mutate(concept.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Conceptos de cobro</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} concepto{data?.total === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={handleCreate} icon={<Plus className="w-4 h-4" />}>
          Nuevo concepto
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
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
            No hay conceptos registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Código</th>
                  <th className="text-left font-medium px-4 py-3">Nombre</th>
                  <th className="text-right font-medium px-4 py-3">Monto por defecto</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((concept) => (
                  <tr key={concept.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">
                      {concept.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{concept.name}</div>
                      {concept.description && (
                        <div className="text-xs text-gray-500">{concept.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      S/ {concept.defaultAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {concept.isActive ? (
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
                          onClick={() => handleEdit(concept)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {concept.isActive && (
                          <button
                            onClick={() => handleDeactivate(concept)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      <FeeConceptFormModal
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditing(null);
        }}
        concept={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['fee-concepts'] });
          setToast({
            type: 'success',
            msg: editing ? 'Concepto actualizado' : 'Concepto creado',
          });
          setIsFormOpen(false);
          setEditing(null);
        }}
      />
    </div>
  );
};