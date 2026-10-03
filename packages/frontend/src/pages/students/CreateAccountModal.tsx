import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { studentsApi } from '@/api/students.api';
import { getErrorMessage } from '@/api/client';
import type { Student } from '@/types/student';

type Props = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
};

type FormData = {
  email: string;
  password: string;
};

export const CreateAccountModal = ({ open, onClose, student, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  useEffect(() => {
    if (open && student) {
      reset({
        email: student.email ?? '',
        password: 'Cambiar123!',
      });
    }
  }, [open, student, reset]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!student) throw new Error('Sin estudiante');
      return studentsApi.createAccount(student.id, data);
    },
    onSuccess,
  });

  const onSubmit = async (data: FormData) => {
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
      title={`Crear cuenta para ${student?.firstName ?? ''} ${student?.lastName ?? ''}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Crear cuenta
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-500">
          El estudiante podrá iniciar sesión con estas credenciales.
        </p>

        <Input
          label="Correo electrónico *"
          type="email"
          {...register('email', { required: 'Requerido' })}
          error={errors.email?.message}
        />

        <Input
          label="Contraseña temporal *"
          {...register('password', {
            required: 'Requerido',
            minLength: { value: 8, message: 'Mínimo 8 caracteres' },
          })}
          error={errors.password?.message}
          hint="Mínimo 8 caracteres. El estudiante debería cambiarla al primer ingreso."
        />
      </form>
    </Modal>
  );
};