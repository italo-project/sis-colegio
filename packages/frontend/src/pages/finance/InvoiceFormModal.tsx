import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { financeApi } from '@/api/finance.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { CreateInvoicePayload } from '@/types/finance';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Student = { id: string; firstName: string; lastName: string; dni: string };

export const InvoiceFormModal = ({ open, onClose, onSuccess }: Props) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoicePayload>();

  const { data: students } = useQuery({
    queryKey: ['students-for-invoice'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Student[] }>('/students', {
        params: { active: 'true', limit: 500 },
      });
      return data.items;
    },
    enabled: open,
  });

  const { data: concepts } = useQuery({
    queryKey: ['concepts-for-invoice'],
    queryFn: () => financeApi.listConcepts({ active: 'true' }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      reset({
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: financeApi.createInvoice,
    onSuccess,
  });

  const onSubmit = async (data: CreateInvoicePayload) => {
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
      title="Nueva factura"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Crear factura
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
          <select
            {...register('feeConceptId', { required: 'Requerido' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {concepts?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — S/ {c.defaultAmount.toFixed(2)}
              </option>
            ))}
          </select>
          {errors.feeConceptId && (
            <p className="text-xs text-red-600 mt-1">{errors.feeConceptId.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Período"
            {...register('period')}
            placeholder="2026-03"
            hint="Opcional. Ej: 2026-03"
          />
          <Input
            label="Fecha de vencimiento *"
            type="date"
            {...register('dueDate', { required: 'Requerido' })}
            error={errors.dueDate?.message}
          />
        </div>

        <Input
          label="Monto (S/)"
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          placeholder="Dejar vacío para usar el monto por defecto del concepto"
          hint="Si se deja vacío, se calcula según el grado del estudiante"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </form>
    </Modal>
  );
};