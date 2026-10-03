import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Building2, Lock, Unlock, Eye, Edit, Trash2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/api/admin.api';
import { Button } from '@/components/ui/Button';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import { EditOrganizationModal } from './EditOrganizationModal';
import { DeleteOrganizationModal } from './DeleteOrganizationModal';
import { getErrorMessage } from '@/api/client';
import type { Organization } from '@/types/admin';

const planLabels: Record<string, string> = {
  basic: 'Básico',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

export const OrganizationsListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'organizations', search],
    queryFn: () => adminApi.listOrganizations({ q: search || undefined }),
  });

  const suspendMutation = useMutation({
    mutationFn: adminApi.suspendOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setToast({ type: 'success', msg: 'Colegio suspendido' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const reactivateMutation = useMutation({
    mutationFn: adminApi.reactivateOrganization,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
      setToast({ type: 'success', msg: 'Colegio reactivado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleSuspend = (org: Organization) => {
    if (confirm(`¿Suspender el colegio "${org.name}"?\n\nLos usuarios no podrán loguearse.`)) {
      suspendMutation.mutate(org.id);
    }
  };

  const handleReactivate = (org: Organization) => {
    if (confirm(`¿Reactivar el colegio "${org.name}"?`)) {
      reactivateMutation.mutate(org.id);
    }
  };

  const handleExport = async (org: Organization) => {
    try {
      const blob = await adminApi.exportOrganization(org.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${org.subdomain}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      setToast({ type: 'success', msg: 'Exportación descargada' });
    } catch (err) {
      setToast({ type: 'error', msg: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colegios</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} colegio{data?.total === 1 ? '' : 's'} en el sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} icon={<Plus className="w-4 h-4" />}>
          Crear colegio
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o subdominio..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none text-sm"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay colegios registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Colegio</th>
                  <th className="text-left font-medium px-4 py-3">Subdominio</th>
                  <th className="text-left font-medium px-4 py-3">Plan</th>
                  <th className="text-left font-medium px-4 py-3">Mercado Pago</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{org.name}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(org.createdAt).toLocaleDateString('es-PE')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {org.subdomain}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                        {planLabels[org.plan] ?? org.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {org.mercadoPago.connected ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Conectado
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          No conectado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {org.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Suspendido
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/admin/organizations/${org.id}`}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setEditing(org)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleExport(org)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="Exportar datos"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {org.isActive ? (
                          <button
                            onClick={() => handleSuspend(org)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                            title="Suspender"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(org)}
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="Reactivar"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setDeleting(org)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateOrganizationModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(data) => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
          setToast({ type: 'success', msg: 'Colegio creado exitosamente' });
          setIsCreateOpen(false);
          alert(
            `✅ Colegio creado\n\n` +
              `Nombre: ${data.organization.name}\n` +
              `Subdominio: ${data.organization.subdomain}\n` +
              `Login URL: ${data.credentials.loginUrl}\n\n` +
              `Credenciales del CEO:\n` +
              `Email: ${data.credentials.email}\n` +
              `Contraseña: ${data.credentials.temporaryPassword}`,
          );
        }}
      />

      <EditOrganizationModal
        open={!!editing}
        onClose={() => setEditing(null)}
        organization={editing}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
          setToast({ type: 'success', msg: 'Colegio actualizado' });
          setEditing(null);
        }}
      />

      <DeleteOrganizationModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        organization={deleting}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'organizations'] });
          setToast({ type: 'success', msg: 'Colegio eliminado' });
          setDeleting(null);
        }}
      />
    </div>
  );
};