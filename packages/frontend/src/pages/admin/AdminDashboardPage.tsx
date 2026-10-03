import { useQuery } from '@tanstack/react-query';
import { Building2, Users, GraduationCap, DollarSign } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { StatCard, Card } from '@/components/ui/Card';

export const AdminDashboardPage = () => {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.globalStats,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Panel global del SaaS</h1>
        <p className="text-sm text-gray-500 mt-1">Métricas de todos los colegios</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Colegios"
          value={stats?.organizations.total ?? '—'}
          icon={<Building2 className="w-5 h-5" />}
          color="blue"
          subtitle={stats ? `${stats.organizations.active} activos` : undefined}
        />
        <StatCard
          title="Alumnos"
          value={stats?.students ?? '—'}
          icon={<Users className="w-5 h-5" />}
          color="green"
          subtitle="En todos los colegios"
        />
        <StatCard
          title="Docentes"
          value={stats?.teachers ?? '—'}
          icon={<GraduationCap className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Cobrado (global)"
          value={stats ? `S/ ${stats.finance.totalCollected.toFixed(2)}` : '—'}
          icon={<DollarSign className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      <Card title="Resumen">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Usuarios registrados</div>
            <div className="text-2xl font-bold text-gray-900">{stats?.users ?? '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Por cobrar (global)</div>
            <div className="text-2xl font-bold text-orange-600">
              S/ {(stats?.finance.totalPending ?? 0).toFixed(2)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};