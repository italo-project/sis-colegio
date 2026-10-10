import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { sectionsApi } from '@/api/sections.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { Section } from '@/types/section';

type Props = {
  open: boolean;
  onClose: () => void;
  section: Section | null;
  onSuccess: () => void;
};

type Teacher = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  dni: string;
};

export const AssignTutorModal = ({ open, onClose, section, onSuccess }: Props) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: teachers, isLoading } = useQuery({
    queryKey: ['teachers-for-tutor'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Teacher[] }>('/teachers', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && section) {
      setSelectedUserId(section.tutorUserId ?? '');
    }
  }, [open, section]);

  const teacherOptions: SearchableOption[] = useMemo(() => {
    const opts: SearchableOption[] = [
      { value: '', label: '— Sin tutor —' },
    ];
    (teachers ?? []).forEach((t) => {
      opts.push({
        value: t.userId,
        label: t.fullName,
        keywords: `${t.email} ${t.dni}`,
      });
    });
    return opts;
  }, [teachers]);

  const mutation = useMutation({
    mutationFn: async (tutorUserId: string | null) => {
      if (!section) throw new Error('Sin sección');
      return sectionsApi.assignTutor(section.id, { tutorUserId });
    },
    onSuccess,
  });

  const handleSave = async () => {
    try {
      await mutation.mutateAsync(selectedUserId || null);
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleRemoveTutor = async () => {
    if (confirm('¿Quitar el tutor de esta sección?')) {
      try {
        await mutation.mutateAsync(null);
      } catch (err) {
        alert(getErrorMessage(err));
      }
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Asignar tutor a sección "${section?.name ?? ''}"`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          {section?.tutorUserId && (
            <Button variant="danger" onClick={handleRemoveTutor} disabled={mutation.isPending}>
              Quitar tutor
            </Button>
          )}
          <Button onClick={handleSave} loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Selecciona un docente activo para asignar como tutor de esta sección. El tutor podrá
          tomar la asistencia de su sección.
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Docente tutor</label>
          <SearchableSelect
            options={teacherOptions}
            value={selectedUserId}
            onChange={setSelectedUserId}
            placeholder="Buscar docente..."
            searchPlaceholder="Escribe nombre, email o DNI..."
            emptyMessage="No hay docentes que coincidan"
            loading={isLoading}
          />
        </div>
      </div>
    </Modal>
  );
};