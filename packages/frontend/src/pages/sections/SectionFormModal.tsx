import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { sectionsApi } from '@/api/sections.api';
import { getErrorMessage } from '@/api/client';
import type { CreateSectionPayload, Section } from '@/types/section';

type Props = {
  open: boolean;
  onClose: () => void;
  section: Section | null;
  onSuccess: () => void;
};

export const SectionFormModal = ({ open, onClose, section, onSuccess }: Props) => {
  const isEdit = !!section;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSectionPayload>();

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: sectionsApi.listAcademicYears,
    enabled: open,
  });

  const { data: grades } = useQuery({
    queryKey: ['grade-levels'],
    queryFn: sectionsApi.listGradeLevels,
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      if (section) {
        reset({
          academicYearId: section.academicYearId,
          gradeLevelId: section.gradeLevelId,
          name: section.name,
          capacity: section.capacity ?? undefined,
        });
      } else {
        reset({});
      }
    }
  }, [open, section, reset]);

  const mutation = useMutation({
    mutationFn: async (data: CreateSectionPayload) => {
      if (isEdit && section) {
        return sectionsApi.update(section.id, {
          name: data.name,
          capacity: data.capacity,
        });
      }
      return sectionsApi.create(data);
    },
    onSuccess,
  });

  const onSubmit = async (data: CreateSectionPayload) => {
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
      title={isEdit ? 'Editar sección' : 'Nueva sección'}
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Guardar cambios' : 'Crear sección'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isEdit ? (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Año escolar *</label>
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Grado *</label>
                <select
                  {...register('gradeLevelId', { required: 'Requerido' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona...</option>
                  {grades?.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {errors.gradeLevelId && (
                  <p className="text-xs text-red-600 mt-1">{errors.gradeLevelId.message}</p>
                )}
              </div>
            </>
          ) : (
            <div className="md:col-span-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              Los campos "Año" y "Grado" no se pueden cambiar al editar.
            </div>
          )}

          <Input
            label="Nombre de la sección *"
            {...register('name', { required: 'Requerido', maxLength: 10 })}
            error={errors.name?.message}
            placeholder="A"
            hint="Ej: A, B, C"
          />

          <Input
            label="Capacidad"
            type="number"
            {...register('capacity', { valueAsNumber: true })}
            placeholder="30"
          />
        </div>
      </form>
    </Modal>
  );
};