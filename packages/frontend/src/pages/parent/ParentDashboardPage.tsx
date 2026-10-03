import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, DollarSign, Award, ArrowRight } from 'lucide-react';
import { meApi } from '@/api/me.api';
import { StatCard, Card } from '@/components/ui/Card';
import { useAuthStore } from '@/stores/auth.store';

export const ParentDashboardPage = () => {
  const user = useAuthStore((s) => s.user);

  const { data: children } = useQuery({
    queryKey: ['my-children'],
    queryFn: meApi.getMyChildren,
  });

  const { data: invoices } = useQuery({
    queryKey: ['my-invoices'],
    queryFn: meApi.getMyInvoices,
  });

  const pendingInvoices =
    invoices?.items.filter((i) => i.status === 'pending' || i.status === 'overdue') ?? [];
  const pendingAmount = pendingInvoices.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Hola, {user?.fullName}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Aquí está el resumen de tus hijos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Mis hijos"
          value={children?.total ?? '—'}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Facturas pendientes"
          value={pendingInvoices.length}
          icon={<DollarSign className="w-5 h-5" />}
          color="yellow"
          subtitle={`S/ ${pendingAmount.toFixed(2)} por pagar`}
        />
        <StatCard
          title="Total facturas"
          value={invoices?.total ?? '—'}
          icon={<Award className="w-5 h-5" />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Mis hijos">
          {!children || children.items.length === 0 ? (
            <p className="text-sm text-gray-500">No tienes hijos registrados.</p>
          ) : (
            <div className="space-y-3">
              {children.items.map((child) => (
                <div
                  key={child.studentId}
                  className="flex items-center justify-between border border-gray-100 rounded-lg p-3"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {child.lastName}, {child.firstName}
                    </div>
                    <div className="text-xs text-gray-500">
                      DNI {child.dni} · {child.relationship}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Link
                      to={`/my-children/${child.studentId}/grades`}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="Ver notas"
                    >
                      <Award className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Acciones rápidas">
          <div className="space-y-2">
            <Link
              to="/my-children"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-gray-900">Mis hijos</div>
                  <div className="text-xs text-gray-500">Ver notas y asistencia</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>

            <Link
              to="/my-invoices"
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-gray-900">Mis pagos</div>
                  <div className="text-xs text-gray-500">
                    {pendingInvoices.length} facturas pendientes
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};