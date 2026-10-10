import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { studentsApi } from '@/api/students.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { ChangeSectionResponse, Student } from '@/types/student';

type Props = {
  open: boolean;
  onClose: () => void;
  student: Student | null;
  onSuccess: () => void;
};

type Section = {
  id: string;
  name: string;
  gradeLevel?: { name: string };
  academicYear?: { year: number };
};

export const ChangeSectionModal = ({ open, onClose, student, onSuccess }: Props) => {
  const [newSectionId, setNewSectionId] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<ChangeSectionResponse | null>(null);

  // Cargar secciones activas (excluyendo la actual)
  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-change', student?.sectionId],
    queryFn: async () => {
      const { data } = await apiClient.get<Section[]>('/academic/sections', {
        params: { active: 'true' },
      });
      return data;
    },
    enabled: open,
  });

  const sectionOptions: SearchableOption[] = useMemo(
    () =>
      (sectionsData ?? [])
        .filter((s) => s.id !== student?.sectionId)
        .map((s) => ({
          value: s.id,
          label: `${s.gradeLevel?.name ?? ''} "${s.name}" (${s.academicYear?.year ?? ''})`,
        })),
    [sectionsData, student?.sectionId],
  );

  useEffect(() => {
    if (open) {
      setNewSectionId('');
      setReason('');
      setResult(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!student) throw new Error('Sin estudiante');
      return studentsApi.changeSection(student.id, {
        newSectionId,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!newSectionId) {
      alert('Debes seleccionar una sección de destino');
      return;
    }
    mutation.mutate();
  };

  const handleClose = () => {
    if (result) {
      setResult(null);
      setNewSectionId('');
      setReason('');
    }
    onClose();
  };

  if (!student) return null;

  const currentSectionLabel = student.section
    ? `${student.section.gradeLevel.name} "${student.section.name}" (${student.section.academicYear.year})`
    : 'Sin sección';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Cambio realizado' : 'Cambiar de sección'}
      size="lg"
      footer={
        result ? (
          <Button onClick={handleClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              loading={mutation.isPending}
              disabled={!newSectionId}
            >
              Confirmar cambio
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <div className="font-semibold mb-1">
                ✅ Estudiante movido de sección
              </div>
              <div>
                Se crearon <strong>{result.enrollmentsCreated}</strong> matrículas
                nuevas en la sección de destino.
              </div>
              {result.averageAtExit !== null && (
                <div className="mt-1">
                  Promedio al salir de la sección anterior:{' '}
                  <strong>{result.averageAtExit.toFixed(2)}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
            El cambio quedó registrado en el historial. Puedes verlo en
            "Ver historial" desde la lista de estudiantes.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Se eliminarán las matrículas actuales del estudiante y se crearán
            nuevas en la sección de destino. Las notas anteriores no se borran,
            pero solo el promedio final se conservará en el historial.
          </div>

          {/* Estudiante */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-1">
            <div className="text-xs text-gray-500">Estudiante</div>
            <div className="font-medium text-gray-900">{student.fullName}</div>
            <div className="text-xs text-gray-500">DNI {student.dni}</div>
          </div>

          {/* Sección actual → nueva */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sección actual
              </label>
              <div className="px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-700 truncate">
                {currentSectionLabel}
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center pb-2">
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva sección *
              </label>
              <SearchableSelect
                options={sectionOptions}
                value={newSectionId}
                onChange={setNewSectionId}
                placeholder="Buscar sección..."
                searchPlaceholder="Escribe grado o letra..."
                emptyMessage="No hay otras secciones disponibles"
              />
            </div>
          </div>

          {!student.sectionId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                El estudiante no tiene sección asignada. Se le asignará la nueva
                sección directamente.
              </span>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Ej: Cambio solicitado por el padre de familia"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Quedará registrado en el historial del estudiante.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};