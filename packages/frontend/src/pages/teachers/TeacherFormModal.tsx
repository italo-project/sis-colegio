import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { teachersApi } from '@/api/teachers.api';
import { getErrorMessage } from '@/api/client';
import type { CreateTeacherPayload, Teacher } from '@/types/teacher';

type Props = {
  open: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  onSuccess: () => void;
};

export const TeacherFormModal = ({ open, onClose, teacher, onSuccess }: Props) => {
  const isEdit = !!teacher;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTeacherPayload>();

  useEffect(() => {
    if (open) {
      if (teacher) {
        reset({
          email: teacher.email,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          dni: teacher.dni,
          phone: teacher.phone ?? undefined,
          birthDate: teacher.birthDate ? teacher.birthDate.substring(0, 10) : undefined,
          hireDate: teacher.hireDate ? teacher.hireDate.substring(0, 10) : undefined,
          specialty: teacher.specialty ?? undefined,
        });
      } else {
        reset({
          password: 'Cambiar123!',
        });
      }
    }
  }, [open, teacher, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateTeacherPayload) => {
      if (isEdit && teacher) {
        return teachersApi.update(teacher.id, data);
      }
      return teachersApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateTeacherPayload) => {
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
      title={isEdit ? 'Editar docente' : 'Nuevo docente'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear docente'}
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
          <Input label="Especialidad" {...register('specialty')} placeholder="Ej: Matemática y Física" />
          <Input
            label="Fecha de nacimiento"
            type="date"
            {...register('birthDate')}
          />
          <Input
            label="Fecha de contratación"
            type="date"
            {...register('hireDate')}
          />

          {!isEdit && (
            <div className="md:col-span-2">
              <Input
                label="Contraseña temporal *"
                {...register('password', {
                  required: 'Requerido',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
                error={errors.password?.message}
                hint="Mínimo 8 caracteres. El docente debería cambiarla al primer ingreso."
              />
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};