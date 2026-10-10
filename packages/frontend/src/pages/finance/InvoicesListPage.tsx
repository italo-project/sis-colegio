import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2, AlertTriangle, Layers, FileText } from 'lucide-react';
import { financeApi } from '@/api/finance.api';
import { Button } from '@/components/ui/Button';
import { InvoiceFormModal } from './InvoiceFormModal';
import { BulkInvoicesModal } from './BulkInvoicesModal';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { getErrorMessage } from '@/api/client';
import type { Invoice, InvoiceStatus } from '@/types/finance';

const statusLabels: Record<InvoiceStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

const statusColors: Record<InvoiceStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export const InvoicesListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusFilter],
    queryFn: () =>
      financeApi.listInvoices({
        status: statusFilter || undefined,
        limit: 200,
        offset: 0,
      }),
  });

  const cancelMutation = useMutation({
    mutationFn: financeApi.cancelInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setToast({ type: 'success', msg: 'Factura cancelada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const filtered =
    data?.items.filter((inv) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (inv.student?.fullName ?? '').toLowerCase().includes(q) ||
        inv.student?.dni.toLowerCase().includes(q) ||
        inv.feeConcept?.name.toLowerCase().includes(q) ||
        inv.period?.toLowerCase().includes(q)
      );
    }) ?? [];

  const handleCancel = (invoice: Invoice) => {
    if (
      confirm(
        `¿Cancelar esta factura?\n\nEstudiante: ${invoice.student?.fullName}\nConcepto: ${invoice.feeConcept?.name}\nMonto: S/ ${invoice.amount.toFixed(2)}`,
      )
    ) {
      cancelMutation.mutate(invoice.id);
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
          <h1 className="text-2xl font-bold text-gray-900">Facturas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} factura{filtered.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsBulkOpen(true)}
            icon={<Layers className="w-4 h-4" />}
          >
            Facturación masiva
          </Button>
          <Button onClick={() => setIsFormOpen(true)} icon={<Plus className="w-4 h-4" />}>
            Nueva factura
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
              placeholder="Buscar por estudiante, concepto o período..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendientes</option>
            <option value="paid">Pagadas</option>
            <option value="overdue">Vencidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay facturas que coincidan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Estudiante</th>
                  <th className="text-left font-medium px-4 py-3">Concepto</th>
                  <th className="text-left font-medium px-4 py-3">Período</th>
                  <th className="text-left font-medium px-4 py-3">Vencimiento</th>
                  <th className="text-right font-medium px-4 py-3">Monto</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {inv.student?.fullName ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">DNI {inv.student?.dni}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.feeConcept?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.period ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(inv.dueDate).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      S/ {inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[inv.status as InvoiceStatus]}`}
                      >
                        {statusLabels[inv.status as InvoiceStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailId(inv.id)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Ver detalle"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancel(inv)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Cancelar"
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

      <InvoiceFormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          setToast({ type: 'success', msg: 'Factura creada' });
          setIsFormOpen(false);
        }}
      />

      <BulkInvoicesModal
        open={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onSuccess={(created) => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] });
          setToast({ type: 'success', msg: `${created} factura(s) creada(s)` });
          setIsBulkOpen(false);
        }}
      />

      <InvoiceDetailModal
        open={!!detailId}
        onClose={() => setDetailId(null)}
        invoiceId={detailId}
      />
    </div>
  );
};