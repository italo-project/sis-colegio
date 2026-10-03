import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, GraduationCap, BookOpen, DollarSign } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { StatCard, Card } from '@/components/ui/Card';

export const OrganizationDetailPage = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organization', id],
    queryFn: () => adminApi.getOrganization(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>;
  }

  if (!data) {
    return <div className="p-12 text-center text-gray-500 text-sm">Colegio no encontrado</div>;
  }

  const { organization, stats, memberships } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/admin/organizations"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Colegios
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">
                {organization.subdomain}.localhost:5173
              </code>
            </p>
          </div>
          <div className="flex gap-2">
            {organization.isActive ? (
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-700">
                Activo
              </span>
            ) : (
              <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
                Suspendido
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Estudiantes"
          value={stats.students}
          icon={<Users className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Docentes"
          value={stats.teachers}
          icon={<GraduationCap className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Cursos"
          value={stats.courses}
          icon={<BookOpen className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Cobrado"
          value={`S/ ${stats.invoices.totalPaid.toFixed(2)}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="yellow"
          subtitle={`S/ ${stats.invoices.totalPending.toFixed(2)} pendiente`}
        />
      </div>

      <Card title={`Usuarios del colegio (${memberships.length})`}>
        <div className="overflow-x-auto -mx-5 -mb-5">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-2">Usuario</th>
                <th className="text-left font-medium px-4 py-2">Email</th>
                <th className="text-left font-medium px-4 py-2">Rol</th>
                <th className="text-left font-medium px-4 py-2">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {memberships.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{m.fullName}</td>
                  <td className="px-4 py-2 text-gray-600">{m.email}</td>
                  <td className="px-4 py-2">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 capitalize">
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {m.isActive ? (
                      <span className="text-green-600 text-xs">Activo</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Inactivo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};