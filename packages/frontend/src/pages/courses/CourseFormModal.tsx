import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { coursesApi } from '@/api/courses.api';
import { apiClient, getErrorMessage } from '@/api/client';
import { formatCourse } from '@/lib/format';
import type { CreateCoursePayload, Course } from '@/types/course';

type Props = {
  open: boolean;
  onClose: () => void;
  course: Course | null;
  onSuccess: () => void;
};

type AcademicYear = { id: string; year: number };
type Section = {
  id: string;
  name: string;
  academicYearId: string;
  gradeLevelId: string;
  gradeLevel?: { id: string; code: string; name: string };
};
type Subject = { id: string; code: string; name: string };
type Teacher = { id: string; fullName: string; dni?: string };

export const CourseFormModal = ({ open, onClose, course, onSuccess }: Props) => {
  const isEdit = !!course;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCoursePayload>();

  // Cargar catálogos
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const { data } = await apiClient.get<AcademicYear[]>('/academic/years');
      return data;
    },
    enabled: open,
  });

  const { data: sections } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data } = await apiClient.get<Section[]>('/academic/sections');
      return data;
    },
    enabled: open,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-for-select'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Subject[] }>('/subjects', {
        params: { active: 'true' },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['teachers-for-select'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Teacher[] }>('/teachers', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (course) {
        reset({
          academicYearId: course.academicYearId,
          sectionId: course.sectionId,
          subjectId: course.subjectId,
          teacherId: course.teacherId ?? '',
          weeklyHours: course.weeklyHours ?? undefined,
        });
      } else {
        reset({});
      }
    }
  }, [open, course, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateCoursePayload) => {
      if (isEdit && course) {
        return coursesApi.update(course.id, {
          teacherId: data.teacherId || null,
          weeklyHours: data.weeklyHours,
        });
      }
      return coursesApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateCoursePayload) => {
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
      title={isEdit ? 'Editar curso' : 'Nuevo curso'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear curso'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {!isEdit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año escolar *
              </label>
              <select
                {...register('academicYearId', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Selecciona...</option>
                {years?.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year}
                  </option>
                ))}
              </select>
              {errors.academicYearId && (
                <p className="text-xs text-red-600 mt-1">{errors.academicYearId.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sección *</label>
              <select
                {...register('sectionId', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Selecciona...</option>
                {sections?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.gradeLevel?.name ?? ''} "{s.name}"
                  </option>
                ))}
              </select>
              {errors.sectionId && (
                <p className="text-xs text-red-600 mt-1">{errors.sectionId.message}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Asignatura *</label>
              <select
                {...register('subjectId', { required: 'Requerido' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Selecciona...</option>
                {subjectsData?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
              {errors.subjectId && (
                <p className="text-xs text-red-600 mt-1">{errors.subjectId.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <div>
              <strong>Curso:</strong>{' '}
              {course &&
                formatCourse({
                  subject: course.subject,
                  section: course.section,
                  academicYear: course.academicYear,
                })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Docente</label>
            <select
              {...register('teacherId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">Sin asignar</option>
              {teachersData?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Puedes dejarlo vacío y asignarlo después
            </p>
          </div>

          <Input
            label="Horas semanales"
            type="number"
            min={1}
            max={40}
            {...register('weeklyHours', { valueAsNumber: true })}
            placeholder="5"
          />
        </div>
      </form>
    </Modal>
  );
};