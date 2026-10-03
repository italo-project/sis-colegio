import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import type { GlobalUser } from '@/types/admin';

type Props = {
  open: boolean;
  onClose: () => void;
  user: GlobalUser | null;
  onSuccess: (password: string) => void;
};

export const ResetPasswordModal = ({ open, onClose, user, onSuccess }: Props) => {
  const [newPassword, setNewPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewPassword(generateRandomPassword());
      setGeneratedPassword(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('Sin usuario');
      return adminApi.resetUserPassword(user.id, newPassword);
    },
    onSuccess: (data) => {
      setGeneratedPassword(data.newPassword);
      onSuccess(data.newPassword);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Resetear contraseña"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cerrar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!!generatedPassword}
          >
            Resetear contraseña
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Usuario: <strong>{user.fullName}</strong>
          <br />
          Email: <code className="text-xs">{user.email}</code>
        </div>

        {!generatedPassword ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña temporal
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={() => setNewPassword(generateRandomPassword())}
                >
                  Generar
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Comparte esta contraseña con el usuario por un canal seguro. Debe cambiarla al
                primer login.
              </p>
            </div>
          </>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800 mb-2">
              ✅ Contraseña reseteada
            </div>
            <div className="text-sm text-green-900 mb-2">
              Nueva contraseña temporal:
            </div>
            <div className="bg-white border border-green-300 rounded p-2 font-mono text-sm select-all">
              {generatedPassword}
            </div>
            <div className="text-xs text-green-700 mt-2">
              ⚠️ Cópiala ahora. No se mostrará de nuevo.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!';
};