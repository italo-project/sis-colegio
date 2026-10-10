import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Clock, XCircle, Receipt } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { StatCard } from '@/components/ui/Card';
import { formatDateEs } from '@/lib/dates';
import type { InvoiceStatus } from '@/types/finance';

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

export const MyPaymentsPage = () => {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: meApi.getMyInvoices,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  const items = invoices?.items ?? [];
  const paid = items.filter((i) => i.status === 'paid');
  const pending = items.filter((i) => i.status === 'pending');
  const overdue = items.filter((i) => i.status === 'overdue');

  const totalPaid = paid.reduce((sum, i) => sum + i.amount, 0);
  const totalPending = pending.reduce((sum, i) => sum + i.amount, 0);
  const totalOverdue = overdue.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis pagos</h1>
        <p className="text-sm text-gray-500 mt-1">Facturas y estado de pagos</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total pagado"
          value={`S/ ${totalPaid.toFixed(2)}`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          subtitle={`${paid.length} factura(s)`}
        />
        <StatCard
          title="Pendiente"
          value={`S/ ${totalPending.toFixed(2)}`}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
          subtitle={`${pending.length} factura(s)`}
        />
        <StatCard
          title="Vencido"
          value={`S/ ${totalOverdue.toFixed(2)}`}
          icon={<XCircle className="w-5 h-5" />}
          color="purple"
          subtitle={`${overdue.length} factura(s)`}
        />
        <StatCard
          title="Total facturas"
          value={items.length}
          icon={<Receipt className="w-5 h-5" />}
          color="blue"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Todas las facturas</h3>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No tienes facturas registradas.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {inv.student?.fullName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{inv.feeConcept?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{inv.period ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDateEs(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      S/ {inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[inv.status]}`}
                      >
                        {statusLabels[inv.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};