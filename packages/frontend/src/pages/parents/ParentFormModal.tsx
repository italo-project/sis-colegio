import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { parentsApi } from '@/api/parents.api';
import { getErrorMessage } from '@/api/client';
import type { CreateParentPayload, Parent } from '@/types/parent';

type Props = {
  open: boolean;
  onClose: () => void;
  parent: Parent | null;
  onSuccess: () => void;
};

export const ParentFormModal = ({ open, onClose, parent, onSuccess }: Props) => {
  const isEdit = !!parent;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateParentPayload>();

  useEffect(() => {
    if (open) {
      if (parent) {
        reset({
          email: parent.email,
          firstName: parent.firstName,
          lastName: parent.lastName,
          dni: parent.dni,
          phone: parent.phone ?? undefined,
          occupation: parent.occupation ?? undefined,
          address: parent.address ?? undefined,
        });
      } else {
        reset({
          password: 'Cambiar123!',
        });
      }
    }
  }, [open, parent, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateParentPayload) => {
      if (isEdit && parent) {
        return parentsApi.update(parent.id, data);
      }
      return parentsApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateParentPayload) => {
    try {
      await mutation.mutateAsync(data);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar padre' : 'Nuevo padre'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear padre'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nombres *"
            {...register('firstName', { required: 'Requerido' })}
            error={errors.firstName?.message}
          />
          <Input
            label="Apellidos *"
            {...register('lastName', { required: 'Requerido' })}
            error={errors.lastName?.message}
          />
          <Input
            label="DNI *"
            {...register('dni', { required: 'Requerido' })}
            error={errors.dni?.message}
          />
          <Input
            label="Correo electrónico *"
            type="email"
            {...register('email', { required: 'Requerido' })}
            error={errors.email?.message}
            disabled={isEdit}
          />
          <Input label="Teléfono" {...register('phone')} />
          <Input label="Ocupación" {...register('occupation')} />
          <div className="md:col-span-2">
            <Input label="Dirección" {...register('address')} />
          </div>

          {!isEdit && (
            <div className="md:col-span-2">
              <Input
                label="Contraseña temporal *"
                {...register('password', {
                  required: 'Requerido',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
                error={errors.password?.message}
                hint="Mínimo 8 caracteres. El padre debería cambiarla al primer ingreso."
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};