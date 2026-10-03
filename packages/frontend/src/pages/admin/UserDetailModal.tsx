import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Shield, User as UserIcon, LogIn } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/api/client';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: string | null;
};

const roleLabels: Record<string, string> = {
  ceo: 'CEO',
  docente: 'Docente',
  estudiante: 'Estudiante',
  padre: 'Padre',
};

export const UserDetailModal = ({ open, onClose, userId }: Props) => {
  const navigate = useNavigate();
  const startImpersonation = useAuthStore((s) => s.startImpersonation);
  const currentUser = useAuthStore((s) => s.user);
  const [isImpersonating, setIsImpersonating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.getUser(userId!),
    enabled: open && !!userId,
  });

  const handleImpersonate = async (organizationId: string) => {
    if (!data) return;

    const confirmed = confirm(
      `¿Entrar al sistema como ${data.user.fullName}?\n\n` +
        `Esto te dará una sesión con sus permisos. Podrás salir cuando quieras desde el banner amarillo.`,
    );
    if (!confirmed) return;

    setIsImpersonating(true);
    try {
      const result = await adminApi.impersonateUser(data.user.id, organizationId);

      startImpersonation({
        accessToken: result.accessToken,
        user: result.user,
        tenant: result.tenant,
        role: result.role,
        impersonatedByName: currentUser?.fullName ?? 'Super Admin',
      });

      onClose();
      navigate('/dashboard');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setIsImpersonating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Detalle de usuario"
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
      ) : !data ? (
        <div className="p-8 text-center text-gray-500">Usuario no encontrado</div>
      ) : (
        <div className="space-y-5">
          {/* Datos del usuario */}
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                data.user.isSuperAdmin ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {data.user.isSuperAdmin ? (
                <Shield className="w-6 h-6" />
              ) : (
                <UserIcon className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="font-bold text-gray-900">{data.user.fullName}</div>
              <div className="text-sm text-gray-500">{data.user.email}</div>
            </div>
          </div>

          {/* Estado */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Estado</div>
              <div className="font-medium">
                {data.user.isActive ? (
                  <span className="text-green-600">Activo</span>
                ) : (
                  <span className="text-red-600">Inactivo</span>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500">Tipo</div>
              <div className="font-medium">
                {data.user.isSuperAdmin ? 'Super Admin' : 'Usuario'}
              </div>
            </div>
          </div>

          {/* Membresías */}
          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">
              Membresías ({data.memberships.length})
            </div>
            {data.memberships.length === 0 ? (
              <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                No pertenece a ningún colegio.
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Colegio</th>
                      <th className="text-left font-medium px-3 py-2">Rol</th>
                      <th className="text-left font-medium px-3 py-2">Estado</th>
                      {!data.user.isSuperAdmin && (
                        <th className="text-right font-medium px-3 py-2">Acción</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.memberships.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">{m.organizationName}</div>
                          <div className="text-xs text-gray-500 font-mono">
                            {m.organizationSubdomain}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                            {roleLabels[m.role] ?? m.role}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {m.isActive ? (
                            <span className="text-green-600 text-xs">Activa</span>
                          ) : (
                            <span className="text-red-600 text-xs">Inactiva</span>
                          )}
                        </td>
                        {!data.user.isSuperAdmin && m.isActive && (
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleImpersonate(m.organizationId)}
                              loading={isImpersonating}
                              icon={<LogIn className="w-3 h-3" />}
                            >
                              Impersonar
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Advertencia */}
          {!data.user.isSuperAdmin && data.memberships.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>💡 Impersonación:</strong> te permite entrar al sistema como este usuario para
              dar soporte. Se registrará en los logs de auditoría. Podrás salir desde el banner
              amarillo que aparecerá en la parte superior.
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};