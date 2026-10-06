import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { enrollmentsApi } from '@/api/enrollments.api';
import { coursesApi } from '@/api/courses.api';
import { apiClient, getErrorMessage } from '@/api/client';
import { formatCourse } from '@/lib/format';
import type { CreateEnrollmentPayload } from '@/types/enrollment';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
};

export const EnrollmentFormModal = ({ open, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEnrollmentPayload>();

  const { data: students } = useQuery({
    queryKey: ['students-for-enroll'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Student[] }>('/students', {
        params: { active: 'true', limit: 200 },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-for-enroll'],
    queryFn: () => coursesApi.list({ active: 'true', limit: 200, offset: 0 }),
    enabled: open,
  });

  useEffect(() => {
    if (open) reset({});
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: enrollmentsApi.create,
    onSuccess,
  });

  const onSubmit = async (data: CreateEnrollmentPayload) => {
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
      title="Nueva matrícula"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Matricular
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estudiante *</label>
          <select
            {...register('studentId', { required: 'Requerido' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {students?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.lastName}, {s.firstName} — DNI {s.dni}
              </option>
            ))}
          </select>
          {errors.studentId && (
            <p className="text-xs text-red-600 mt-1">{errors.studentId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
          <select
            {...register('courseId', { required: 'Requerido' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {courses?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {formatCourse(c)}
              </option>
            ))}
          </select>
          {errors.courseId && (
            <p className="text-xs text-red-600 mt-1">{errors.courseId.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Observaciones opcionales..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </form>
    </Modal>
  );
};