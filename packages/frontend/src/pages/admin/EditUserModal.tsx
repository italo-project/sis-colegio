import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import type { GlobalUser } from '@/types/admin';

type Props = {
  open: boolean;
  onClose: () => void;
  user: GlobalUser | null;
  onSuccess: () => void;
};

export const EditUserModal = ({ open, onClose, user, onSuccess }: Props) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (open && user) {
      setFullName(user.fullName);
      setEmail(user.email);
    }
  }, [open, user]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('Sin usuario');
      return adminApi.updateUser(user.id, { fullName, email });
    },
    onSuccess,
    onError: (err) => alert(getErrorMessage(err)),
  });

  if (!user) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar usuario"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          Cambiar el email afecta el login del usuario. Notifícale el cambio.
        </div>
      </div>
    </Modal>
  );
};