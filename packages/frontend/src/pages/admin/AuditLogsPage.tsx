import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Search } from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { formatDateTimeEs } from '@/lib/dates';

const actionLabels: Record<string, string> = {
  'organization.created': 'Colegio creado',
  'organization.updated': 'Colegio actualizado',
  'organization.suspended': 'Colegio suspendido',
  'organization.reactivated': 'Colegio reactivado',
  'organization.deleted': 'Colegio eliminado',
  'organization.exported': 'Datos exportados',
  'user.updated': 'Usuario actualizado',
  'user.activated': 'Usuario activado',
  'user.deactivated': 'Usuario desactivado',
  'user.deleted': 'Usuario eliminado',
  'user.password_reset': 'Contraseña reseteada',
  'user.impersonated': 'Usuario impersonado',
  'impersonation.ended': 'Impersonación finalizada',
};

const actionColors: Record<string, string> = {
  'organization.created': 'bg-green-100 text-green-700',
  'organization.deleted': 'bg-red-100 text-red-700',
  'organization.suspended': 'bg-orange-100 text-orange-700',
  'organization.reactivated': 'bg-blue-100 text-blue-700',
  'user.deleted': 'bg-red-100 text-red-700',
  'user.deactivated': 'bg-orange-100 text-orange-700',
  'user.impersonated': 'bg-purple-100 text-purple-700',
  'user.password_reset': 'bg-yellow-100 text-yellow-700',
};

export const AuditLogsPage = () => {
  const [filterAction, setFilterAction] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'audit-logs', filterAction],
    queryFn: () =>
      adminApi.listAuditLogs({
        action: filterAction || undefined,
        limit: 100,
      }),
  });

  const filtered = data?.items.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.actorEmail.toLowerCase().includes(q) ||
      log.targetName?.toLowerCase().includes(q) ||
      log.organizationName?.toLowerCase().includes(q) ||
      actionLabels[log.action]?.toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Logs de auditoría</h1>
        <p className="text-sm text-gray-500 mt-1">
          Registro de acciones del super-administrador
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email, colegio o acción..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none text-sm"
            />
          </div>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none text-sm"
          >
            <option value="">Todas las acciones</option>
            {Object.entries(actionLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No hay logs que coincidan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Fecha</th>
                  <th className="text-left font-medium px-4 py-3">Acción</th>
                  <th className="text-left font-medium px-4 py-3">Actor</th>
                  <th className="text-left font-medium px-4 py-3">Objetivo</th>
                  <th className="text-left font-medium px-4 py-3">Colegio</th>
                  <th className="text-left font-medium px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                      {formatDateTimeEs(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          actionColors[log.action] ?? 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {actionLabels[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.actorEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {log.targetName ?? '—'}
                      </div>
                      {log.targetType && (
                        <div className="text-xs text-gray-500 capitalize">
                          {log.targetType}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {log.organizationName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">
                      {log.ipAddress ?? '—'}
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