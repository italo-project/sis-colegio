import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { enrollmentsApi } from '@/api/enrollments.api';
import type { Course } from '@/types/course';
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
  fullName: string;
  dni: string;
};

export const EnrollmentFormModal = ({ open, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateEnrollmentPayload>();

  const { data: students } = useQuery({
    queryKey: ['students-for-enroll'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Student[] }>('/students', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: courses } = useQuery({
    queryKey: ['courses-for-enroll'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Course[]; total: number }>('/courses', {
        params: { active: 'true', limit: 1000, offset: 0 },
      });
      return data;
    },
    enabled: open,
  });

  // Convertir a opciones de SearchableSelect
  const studentOptions: SearchableOption[] = useMemo(
    () =>
      (students ?? []).map((s) => ({
        value: s.id,
        label: s.fullName,
        keywords: s.dni,
      })),
    [students],
  );

  const courseOptions: SearchableOption[] = useMemo(
    () =>
      (courses?.items ?? []).map((c) => ({
        value: c.id,
        label: formatCourse({
          subject: c.subject,
          section: c.section,
          academicYear: c.academicYear,
        }),
        keywords: `${c.subject.code} ${c.section.gradeLevel?.name ?? ''} ${c.section.name}`,
      })),
    [courses],
  );

  const studentId = watch('studentId') ?? '';
  const courseId = watch('courseId') ?? '';

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
          <SearchableSelect
            options={studentOptions}
            value={studentId}
            onChange={(val) => setValue('studentId', val, { shouldValidate: true })}
            placeholder="Buscar estudiante..."
            searchPlaceholder="Escribe nombre o DNI..."
            emptyMessage="No hay estudiantes que coincidan"
            error={errors.studentId?.message}
          />
          <input
            type="hidden"
            {...register('studentId', { required: 'Requerido' })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Curso *</label>
          <SearchableSelect
            options={courseOptions}
            value={courseId}
            onChange={(val) => setValue('courseId', val, { shouldValidate: true })}
            placeholder="Buscar curso..."
            searchPlaceholder="Escribe materia, grado o sección..."
            emptyMessage="No hay cursos que coincidan"
            error={errors.courseId?.message}
          />
          <input
            type="hidden"
            {...register('courseId', { required: 'Requerido' })}
          />
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