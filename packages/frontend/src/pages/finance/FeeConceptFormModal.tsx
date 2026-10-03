import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { financeApi } from '@/api/finance.api';
import { getErrorMessage } from '@/api/client';
import type { CreateFeeConceptPayload, FeeConcept } from '@/types/finance';

type Props = {
  open: boolean;
  onClose: () => void;
  concept: FeeConcept | null;
  onSuccess: () => void;
};

export const FeeConceptFormModal = ({ open, onClose, concept, onSuccess }: Props) => {
  const isEdit = !!concept;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFeeConceptPayload>();

  useEffect(() => {
    if (open) {
      if (concept) {
        reset({
          code: concept.code,
          name: concept.name,
          description: concept.description ?? undefined,
          defaultAmount: concept.defaultAmount,
        });
      } else {
        reset({});
      }
    }
  }, [open, concept, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateFeeConceptPayload) => {
      if (isEdit && concept) {
        return financeApi.updateConcept(concept.id, data);
      }
      return financeApi.createConcept(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateFeeConceptPayload) => {
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
      title={isEdit ? 'Editar concepto' : 'Nuevo concepto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear concepto'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Código *"
            {...register('code', {
              required: 'Requerido',
              pattern: {
                value: /^[A-Z0-9_-]+$/,
                message: 'Solo mayúsculas, números, - y _',
              },
            })}
            error={errors.code?.message}
            placeholder="PENSION"
            disabled={isEdit}
            hint={isEdit ? 'No se puede cambiar' : 'Ej: PENSION, MATRICULA'}
          />
          <Input
            label="Nombre *"
            {...register('name', { required: 'Requerido' })}
            error={errors.name?.message}
            placeholder="Pensión Mensual"
          />
        </div>

        <Input
          label="Monto por defecto (S/) *"
          type="number"
          step="0.01"
          {...register('defaultAmount', { required: 'Requerido', valueAsNumber: true })}
          error={errors.defaultAmount?.message}
          placeholder="500.00"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </form>
    </Modal>
  );
};