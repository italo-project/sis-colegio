import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { financeApi } from '@/api/finance.api';
import type { InvoiceStatus } from '@/types/finance';

type Props = {
  open: boolean;
  onClose: () => void;
  invoiceId: string | null;
};

const statusLabels: Record<InvoiceStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  overdue: 'Vencida',
  cancelled: 'Cancelada',
};

export const InvoiceDetailModal = ({ open, onClose, invoiceId }: Props) => {
  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice-detail', invoiceId],
    queryFn: () => financeApi.getInvoice(invoiceId!),
    enabled: open && !!invoiceId,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de factura"
      size="lg"
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
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : !invoice ? (
        <div className="p-8 text-center text-gray-500">Factura no encontrada</div>
      ) : (
        <div className="space-y-5">
          {/* Info principal */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500">Estudiante</div>
              <div className="font-medium text-gray-900">
                {invoice.student?.fullName ?? '—'}
              </div>
              <div className="text-xs text-gray-500">DNI {invoice.student?.dni}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Estado</div>
              <div className="font-medium">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    invoice.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : invoice.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {statusLabels[invoice.status]}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Concepto</div>
              <div className="font-medium text-gray-900">{invoice.feeConcept?.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Período</div>
              <div className="text-gray-700">{invoice.period ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Vencimiento</div>
              <div className="text-gray-700">
                {new Date(invoice.dueDate).toLocaleDateString('es-PE')}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Monto</div>
              <div className="font-bold text-gray-900 text-lg">
                S/ {invoice.amount.toFixed(2)}
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Notas</div>
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Pagos */}
          <div>
            <div className="text-sm font-medium text-gray-900 mb-2">
              Pagos ({invoice.payments?.length ?? 0})
            </div>
            {!invoice.payments || invoice.payments.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                No hay pagos registrados para esta factura.
              </div>
            ) : (
              <div className="space-y-2">
                {invoice.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-sm border border-gray-200 rounded-lg p-3"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        S/ {p.amount.toFixed(2)} — {p.method}
                      </div>
                      <div className="text-xs text-gray-500">
                        {p.gateway ?? 'local'} · {p.status}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString('es-PE') : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};