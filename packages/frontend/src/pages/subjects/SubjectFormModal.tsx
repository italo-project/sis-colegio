import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { subjectsApi } from '@/api/subjects.api';
import { getErrorMessage } from '@/api/client';
import type { CreateSubjectPayload, Subject } from '@/types/subject';

type Props = {
  open: boolean;
  onClose: () => void;
  subject: Subject | null;
  onSuccess: () => void;
};

export const SubjectFormModal = ({ open, onClose, subject, onSuccess }: Props) => {
  const isEdit = !!subject;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSubjectPayload>();

  useEffect(() => {
    if (open) {
      if (subject) {
        reset({
          code: subject.code,
          name: subject.name,
          description: subject.description ?? undefined,
          area: subject.area ?? undefined,
        });
      } else {
        reset({});
      }
    }
  }, [open, subject, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateSubjectPayload) => {
      if (isEdit && subject) {
        return subjectsApi.update(subject.id, data);
      }
      return subjectsApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateSubjectPayload) => {
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
      title={isEdit ? 'Editar asignatura' : 'Nueva asignatura'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear asignatura'}
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
            placeholder="MAT"
            disabled={isEdit}
            hint={isEdit ? 'No se puede cambiar el código' : 'Ej: MAT, COM, CTA'}
          />
          <Input
            label="Nombre *"
            {...register('name', { required: 'Requerido' })}
            error={errors.name?.message}
            placeholder="Matemática"
          />
          <Input
            label="Área"
            {...register('area')}
            placeholder="Ciencias"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Álgebra, geometría y aritmética..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </form>
    </Modal>
  );
};