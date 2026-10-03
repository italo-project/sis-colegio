import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import type { CreateOrganizationPayload } from '@/types/admin';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (data: any) => void;
};

export const CreateOrganizationModal = ({ open, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationPayload>({
    defaultValues: {
      plan: 'basic',
      ceoPassword: 'Cambiar123!',
    },
  });

  const name = watch('name');
  const subdomainInput = watch('subdomain');

  const previewSubdomain =
    subdomainInput ||
    name
      ?.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') ||
    '';

  const mutation = useMutation({
    mutationFn: adminApi.createOrganization,
    onSuccess: (data) => {
      onSuccess(data);
      reset();
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const onSubmit = async (data: CreateOrganizationPayload) => {
    const slug = data.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const payload: CreateOrganizationPayload = {
      ...data,
      subdomain: data.subdomain || slug,
      schemaName: data.schemaName || `tenant_${slug.replace(/-/g, '_')}`,
    };

    await mutation.mutateAsync(payload);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear nuevo colegio"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Crear colegio
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Datos del colegio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre del colegio *"
              {...register('name', { required: 'Requerido' })}
              error={errors.name?.message}
              placeholder="Ej: Colegio San Martín"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
              <select
                {...register('plan')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              >
                <option value="basic">Básico</option>
                <option value="pro">Pro</option>
                <option value="business">Business</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Usuario CEO del colegio</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nombre completo *"
              {...register('ceoFullName', { required: 'Requerido' })}
              error={errors.ceoFullName?.message}
              placeholder="Ej: Juan Pérez"
            />
            <Input
              label="Email *"
              type="email"
              {...register('ceoEmail', { required: 'Requerido' })}
              error={errors.ceoEmail?.message}
              placeholder="ceo@colegio.edu.pe"
            />
            <div className="md:col-span-2">
              <Input
                label="Contraseña temporal *"
                {...register('ceoPassword', {
                  required: 'Requerido',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
                error={errors.ceoPassword?.message}
                hint="El CEO deberá cambiarla al primer ingreso"
              />
            </div>
          </div>
        </div>

        {previewSubdomain && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>Vista previa:</strong>
            <div className="mt-1">
              URL del colegio: <code>{previewSubdomain}.localhost:5173</code>
            </div>
            <div>
              Esquema: <code>tenant_{previewSubdomain.replace(/-/g, '_')}</code>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};