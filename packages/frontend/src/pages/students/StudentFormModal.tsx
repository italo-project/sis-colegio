import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { studentsApi } from '@/api/students.api';
import { getErrorMessage } from '@/api/client';
import type { CreateStudentPayload, Student } from '@/types/student';

type Props = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
};

export const StudentFormModal = ({ open, onClose, student, onSuccess }: Props) => {
  const isEdit = !!student;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateStudentPayload>();

  useEffect(() => {
    if (open) {
      if (student) {
        reset({
          firstName: student.firstName,
          lastName: student.lastName,
          dni: student.dni,
          birthDate: student.birthDate ? student.birthDate.substring(0, 10) : undefined,
          gender: student.gender ?? undefined,
          email: student.email ?? undefined,
          phone: student.phone ?? undefined,
          address: student.address ?? undefined,
          guardianName: student.guardianName ?? undefined,
          guardianPhone: student.guardianPhone ?? undefined,
        });
      } else {
        reset({});
      }
    }
  }, [open, student, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateStudentPayload) => {
      if (isEdit && student) {
        return studentsApi.update(student.id, data);
      }
      return studentsApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateStudentPayload) => {
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
      title={isEdit ? 'Editar estudiante' : 'Nuevo estudiante'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear estudiante'}
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
            label="Fecha de nacimiento"
            type="date"
            {...register('birthDate')}
            error={errors.birthDate?.message}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
            <select
              {...register('gender')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Sin especificar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="X">Otro</option>
            </select>
          </div>
          <Input label="Teléfono" {...register('phone')} />
          <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          <Input label="Dirección" {...register('address')} />
          <Input label="Apoderado" {...register('guardianName')} />
          <Input label="Teléfono del apoderado" {...register('guardianPhone')} />
        </div>
      </form>
    </Modal>
  );
};