import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  FileText,
  Download,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { financeApi } from '@/api/finance.api';
import { StatCard, Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export const FinanceDashboardPage = () => {
  const { data: summary } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: financeApi.summary,
  });

  const { data: byPeriod } = useQuery({
    queryKey: ['finance', 'by-period'],
    queryFn: () => financeApi.byPeriod(),
  });

  const { data: overdue } = useQuery({
    queryKey: ['finance', 'overdue'],
    queryFn: financeApi.overdue,
  });

  const handleExportCsv = async () => {
    try {
      const blob = await financeApi.exportInvoicesCsv({});
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al exportar');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos y Facturación</h1>
          <p className="text-sm text-gray-500 mt-1">Resumen financiero del colegio</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="w-4 h-4" />}
          onClick={handleExportCsv}
        >
          Exportar CSV
        </Button>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total facturado"
          value={`S/ ${(summary?.totalBilled ?? 0).toFixed(2)}`}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Total cobrado"
          value={`S/ ${(summary?.totalCollected ?? 0).toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
          subtitle={
            summary ? `Tasa: ${summary.collectionRate.toFixed(1)}%` : undefined
          }
        />
        <StatCard
          title="Por cobrar"
          value={`S/ ${(summary?.totalPending ?? 0).toFixed(2)}`}
          icon={<AlertCircle className="w-5 h-5" />}
          color="yellow"
        />
        <StatCard
          title="Vencidas"
          value={`${overdue?.total ?? 0}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          subtitle={overdue ? `S/ ${overdue.totalAmount.toFixed(2)}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ingresos por período */}
        <Card title="Ingresos por mes">
          {!byPeriod || byPeriod.items.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos de ingresos aún.</p>
          ) : (
            <div className="space-y-3">
              {byPeriod.items.slice(0, 6).map((item) => (
                <div key={item.period} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{item.period}</div>
                    <div className="text-xs text-gray-500">
                      {item.count} factura{item.count === 1 ? '' : 's'}
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-gray-900">
                    S/ {item.total.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Acciones rápidas */}
        <Card title="Acciones rápidas">
          <div className="space-y-2">
            <Link
              to="/finance/invoices"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Ver facturas</div>
                  <div className="text-xs text-gray-500">
                    {summary?.byStatus.pending.count ?? 0} pendientes
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/finance/concepts"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Conceptos de cobro</div>
                  <div className="text-xs text-gray-500">Matrículas, pensiones, etc.</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Facturas vencidas */}
      <Card title={`Facturas vencidas (${overdue?.total ?? 0})`}>
        {!overdue || overdue.items.length === 0 ? (
          <p className="text-sm text-gray-500">No hay facturas vencidas.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Estudiante</th>
                  <th className="text-left font-medium px-4 py-2">Concepto</th>
                  <th className="text-left font-medium px-4 py-2">Vencimiento</th>
                  <th className="text-left font-medium px-4 py-2">Días mora</th>
                  <th className="text-right font-medium px-4 py-2">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {overdue.items.slice(0, 10).map((inv) => (
                  <tr key={inv.id}>
                    <td className="px-4 py-2">
                      {inv.student.lastName}, {inv.student.firstName}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{inv.feeConcept.name}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(inv.dueDate).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        {inv.daysOverdue} días
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium">
                      S/ {inv.amount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};