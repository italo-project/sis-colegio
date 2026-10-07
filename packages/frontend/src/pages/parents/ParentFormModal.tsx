import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, Check, KeyRound, Eye, EyeOff } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { parentsApi } from '@/api/parents.api';
import { getErrorMessage } from '@/api/client';
import type { Parent } from '@/types/parent';

type Props = {
  open: boolean;
  onClose: () => void;
  parent: Parent | null;
  onSuccess: () => void;
};

type FormData = {
  dni: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  password: string;
};

const emptyForm = (): FormData => ({
  dni: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  password: '',
});

export const ParentFormModal = ({ open, onClose, parent, onSuccess }: Props) => {
  const isEdit = !!parent;
  const [form, setForm] = useState<FormData>(emptyForm());
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setCredentials(null);
      setCopied(false);
      setShowPassword(false);
      if (parent) {
        setForm({
          dni: parent.dni,
          fullName: parent.fullName,
          email: parent.email,
          phone: parent.phone ?? '',
          address: parent.address ?? '',
          password: '',
        });
      } else {
        setForm(emptyForm());
      }
    }
  }, [open, parent]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (isEdit && parent) {
        return parentsApi.update(parent.id, {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          address: form.address || undefined,
          password: form.password.trim() || undefined,
        } as any);
      }
      return parentsApi.create({
        email: form.email,
        fullName: form.fullName,
        dni: form.dni,
        phone: form.phone || undefined,
        address: form.address || undefined,
      });
    },
    onSuccess: (data) => {
      if (!isEdit) {
        const result = data as Parent & { credentials?: { temporaryPassword?: string } };
        if (result.credentials?.temporaryPassword) {
          setCredentials({
            email: form.email,
            password: result.credentials.temporaryPassword,
          });
        } else {
          onSuccess();
        }
      } else {
        onSuccess();
      }
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleSubmit = async () => {
    if (!form.dni || !form.fullName || !form.email) {
      alert('DNI, Nombre completo y Email son obligatorios');
      return;
    }

    if (isEdit && form.password && form.password.trim().length > 0 && form.password.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    mutation.mutate();
  };

  const handleClose = () => {
    setCredentials(null);
    setCopied(false);
    setForm(emptyForm());
    onClose();
  };

  const copyCredentials = async () => {
    if (!credentials) return;
    const text = `Email: ${credentials.email}\nContraseña: ${credentials.password}\n\nCambia tu contraseña al primer inicio de sesión.`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('No se pudo copiar al portapapeles');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={credentials ? 'Padre creado' : isEdit ? 'Editar padre' : 'Nuevo padre'}
      size="lg"
      footer={
        credentials ? (
          <>
            <Button
              variant="secondary"
              onClick={copyCredentials}
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copiado' : 'Copiar credenciales'}
            </Button>
            <Button
              onClick={() => {
                handleClose();
                onSuccess();
              }}
            >
              Cerrar
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending}>
              {isEdit ? 'Guardar cambios' : 'Crear padre'}
            </Button>
          </>
        )
      }
    >
      {credentials ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="font-semibold text-green-800 mb-1">
              ✅ Padre creado exitosamente
            </div>
            <div className="text-sm text-green-700">
              Comparte estas credenciales con el padre de forma segura.
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-2">
            <div>
              <div className="text-xs text-gray-500 mb-1">Email</div>
              <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                {credentials.email}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Contraseña temporal</div>
              <div className="font-mono text-sm bg-yellow-50 px-3 py-2 rounded">
                {credentials.password}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>⚠️ Importante:</strong> La contraseña solo se muestra aquí una vez.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!isEdit && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              El padre deberá cambiar su contraseña al iniciar sesión por primera vez.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="DNI *"
              value={form.dni}
              onChange={(e) => updateField('dni', e.target.value)}
              disabled={isEdit}
            />
            <Input
              label="Nombre completo *"
              value={form.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              disabled={isEdit}
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              label="Teléfono"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <div className="md:col-span-2">
              <Input
                label="Dirección"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </div>

          {isEdit && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-gray-500" />
                <h4 className="text-sm font-medium text-gray-900">
                  Cambiar contraseña (opcional)
                </h4>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 mb-3">
                Déjalo vacío si no quieres cambiar la contraseña. Útil cuando un padre
                olvidó su contraseña y no puede recuperarla.
              </div>

              <div className="relative">
                <Input
                  label="Nueva contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Dejar vacío para no cambiar"
                  hint="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};