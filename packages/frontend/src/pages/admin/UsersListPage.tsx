import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Edit,
  KeyRound,
  UserCheck,
  UserX,
  Eye,
  Trash2,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import { UserDetailModal } from './UserDetailModal';
import { EditUserModal } from './EditUserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import type { GlobalUser } from '@/types/admin';

export const UsersListPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [detailUser, setDetailUser] = useState<GlobalUser | null>(null);
  const [editingUser, setEditingUser] = useState<GlobalUser | null>(null);
  const [resetUser, setResetUser] = useState<GlobalUser | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, filterActive],
    queryFn: () =>
      adminApi.listUsers({
        q: search || undefined,
        isActive: filterActive || undefined,
      }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: adminApi.toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setToast({ type: 'success', msg: 'Usuario actualizado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const deleteMutation = useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setToast({ type: 'success', msg: 'Usuario eliminado' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleToggleActive = (user: GlobalUser) => {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (confirm(`¿${action} a ${user.fullName}?`)) {
      toggleActiveMutation.mutate(user.id);
    }
  };

  const handleDelete = (user: GlobalUser) => {
    if (
      confirm(
        `¿Eliminar definitivamente a ${user.fullName}?\n\n` +
          `Solo funciona si no tiene membresías en colegios.\n` +
          `Si tiene, usa "desactivar" en su lugar.`,
      )
    ) {
      deleteMutation.mutate(user.id);
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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuarios globales</h1>
        <p className="text-sm text-gray-500 mt-1">
          {data?.total ?? 0} usuario{data?.total === 1 ? '' : 's'} en el sistema
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
              placeholder="Buscar por nombre o email..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none text-sm"
            />
          </div>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none text-sm"
          >
            <option value="">Todos</option>
            <option value="true">Solo activos</option>
            <option value="false">Solo inactivos</option>
          </select>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">No hay usuarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Usuario</th>
                  <th className="text-left font-medium px-4 py-3">Email</th>
                  <th className="text-left font-medium px-4 py-3">Colegios</th>
                  <th className="text-left font-medium px-4 py-3">Tipo</th>
                  <th className="text-left font-medium px-4 py-3">Estado</th>
                  <th className="text-right font-medium px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            user.isSuperAdmin
                              ? 'bg-slate-800 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {user.isSuperAdmin ? (
                            <Shield className="w-4 h-4" />
                          ) : (
                            <UserIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('es-PE')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                        {user.membershipsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isSuperAdmin ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-800 text-white">
                          Super Admin
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          Usuario
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailUser(user)}
                          className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setResetUser(user)}
                          className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Resetear contraseña"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {!user.isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                              title={user.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {user.isActive ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
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

      <UserDetailModal
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        userId={detailUser?.id ?? null}
      />

      <EditUserModal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
          setToast({ type: 'success', msg: 'Usuario actualizado' });
          setEditingUser(null);
        }}
      />

      <ResetPasswordModal
        open={!!resetUser}
        onClose={() => setResetUser(null)}
        user={resetUser}
        onSuccess={() => {
          setResetUser(null);
        }}
      />
    </div>
  );
};