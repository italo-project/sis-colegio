import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, ArrowRight, Users, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { closeYearApi } from '@/api/close-year.api';
import { sectionsApi } from '@/api/sections.api';
import { getErrorMessage } from '@/api/client';
import type {
  CloseYearCandidate,
  PreloadNextYearResponse,
} from '@/types/close-year';

type Props = {
  open: boolean;
  onClose: () => void;
  fromAcademicYearId: string;
  currentYear: number | null;
  onSuccess: () => void;
};

type Step = 'config' | 'assign' | 'done';

export const PreloadNextYearModal = ({
  open,
  onClose,
  fromAcademicYearId,
  currentYear,
  onSuccess,
}: Props) => {
  const [step, setStep] = useState<Step>('config');

  const [newYear, setNewYear] = useState<number>((currentYear ?? new Date().getFullYear()) + 1);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  const [preloadResult, setPreloadResult] = useState<PreloadNextYearResponse | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && currentYear) {
      const nextYear = currentYear + 1;
      setNewYear(nextYear);
      setNewStartDate(`${nextYear}-03-01`);
      setNewEndDate(`${nextYear}-12-15`);
      setStep('config');
      setPreloadResult(null);
      setAssignments({});
    }
  }, [open, currentYear]);

  const { data: candidatesData } = useQuery({
    queryKey: ['close-year-candidates-for-preload', fromAcademicYearId],
    queryFn: () => closeYearApi.listCandidates(fromAcademicYearId),
    enabled: open && !!fromAcademicYearId,
  });

  const promotedCandidates = useMemo<CloseYearCandidate[]>(() => {
    if (!candidatesData) return [];
    return candidatesData.candidates.filter((c) => c.suggestedStatus === 'promoted');
  }, [candidatesData]);

  const { data: newSections } = useQuery({
    queryKey: ['sections-new-year', preloadResult?.newAcademicYear.id],
    queryFn: () =>
      sectionsApi.list({ yearId: preloadResult!.newAcademicYear.id, active: 'true' }),
    enabled: !!preloadResult && step === 'assign',
  });

  const preloadMutation = useMutation({
    mutationFn: () =>
      closeYearApi.preloadNextYear({
        fromAcademicYearId,
        newYear,
        newStartDate,
        newEndDate,
      }),
    onSuccess: (data) => {
      setPreloadResult(data);
      setStep('assign');
      const auto: Record<string, string> = {};
      for (const c of promotedCandidates) {
        if (!c.section) continue;

        const oldGradeOrder = c.section.gradeLevel.orderIndex;
        const nextGrade = data.nextGradeMap[String(oldGradeOrder)];
        if (!nextGrade) continue;

        const match = data.createdSections.find(
          (s) =>
            s.gradeLevelId === nextGrade.id &&
            s.sectionName === c.section!.name,
        );
        if (match) {
          auto[c.studentId] = match.newSectionId;
        }
      }
      setAssignments(auto);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!preloadResult) throw new Error('Sin precarga');
      const list = Object.entries(assignments)
        .filter(([, sectionId]) => sectionId)
        .map(([studentId, nextSectionId]) => ({ studentId, nextSectionId }));

      return closeYearApi.assignNextSections({
        academicYearId: fromAcademicYearId,
        assignments: list,
      });
    },
    onSuccess: () => {
      setStep('done');
      onSuccess();
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleClose = () => {
    setStep('config');
    setPreloadResult(null);
    setAssignments({});
    onClose();
  };

  const sectionOptions: SearchableOption[] = useMemo(() => {
    if (!newSections) return [];
    return newSections
      .filter((s) => s.gradeLevel)
      .map((s) => ({
        value: s.id,
        label: `${s.gradeLevel!.name} "${s.name}"`,
        keywords: `${s.gradeLevel!.name} ${s.name}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [newSections]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        step === 'config'
          ? 'Precargar año escolar'
          : step === 'assign'
            ? 'Asignar secciones a promovidos'
            : 'Año siguiente listo'
      }
      size="2xl"
      footer={
        step === 'config' ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={preloadMutation.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => preloadMutation.mutate()}
              loading={preloadMutation.isPending}
              disabled={!newYear || !newStartDate || !newEndDate}
            >
              Crear año y copiar secciones
            </Button>
          </>
        ) : step === 'assign' ? (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={assignMutation.isPending}>
              Cerrar sin asignar
            </Button>
            <Button
              onClick={() => assignMutation.mutate()}
              loading={assignMutation.isPending}
              disabled={
                Object.values(assignments).filter(Boolean).length === 0
              }
            >
              Guardar asignaciones ({Object.values(assignments).filter(Boolean).length})
            </Button>
          </>
        ) : (
          <Button onClick={handleClose}>Cerrar</Button>
        )
      }
    >
      {step === 'config' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Se creará el año <strong>{newYear}</strong> y se copiarán las secciones
            del año actual (mismos nombres "A", "B", "C", pero apuntando al nuevo año).
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Año nuevo *"
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
            />
            <Input
              label="Inicio de clases *"
              type="date"
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
            />
            <Input
              label="Fin de clases *"
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
            <strong>Nota:</strong> el año nuevo se crea como inactivo. Podrás
            activarlo cuando empiece el año escolar.
          </div>
        </div>
      )}

      {step === 'assign' && preloadResult && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-800">
              <div className="font-semibold">
                Año {preloadResult.newAcademicYear.year} creado
              </div>
              <div>
                Se copiaron {preloadResult.createdSections.length} secciones.
              </div>
            </div>
          </div>

          {promotedCandidates.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              No hay estudiantes marcados como <strong>promovidos</strong> aún.
              Vuelve al paso anterior y aplica las sugerencias primero.
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  Hemos pre-asignado automáticamente la sección de destino según el
                  nombre (por ejemplo, "3°A 2026" → "4°A 2027"). Puedes cambiarla
                  manualmente si lo necesitas.
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Users className="w-4 h-4" />
                {promotedCandidates.length} promovido(s) por asignar
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[55vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="text-left font-medium px-4 py-2">Estudiante</th>
                      <th className="text-left font-medium px-4 py-2">Sección actual</th>
                      <th className="text-left font-medium px-4 py-2 w-16 text-center">
                        <ArrowRight className="w-4 h-4 inline" />
                      </th>
                      <th className="text-left font-medium px-4 py-2 w-72">
                        Sección nueva
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {promotedCandidates.map((c) => (
                      <tr key={c.studentId}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {c.fullName}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {c.section
                            ? `${c.section.gradeLevel.name} "${c.section.name}"`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-400">→</td>
                        <td className="px-4 py-3">
                          <SearchableSelect
                            options={sectionOptions}
                            value={assignments[c.studentId] ?? ''}
                            onChange={(val) =>
                              setAssignments((prev) => ({
                                ...prev,
                                [c.studentId]: val,
                              }))
                            }
                            placeholder="Seleccionar sección..."
                            searchPlaceholder="Buscar sección..."
                            emptyMessage="Sin secciones disponibles"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <div className="text-lg font-semibold text-green-900 mb-1">
              ¡Todo listo!
            </div>
            <div className="text-sm text-green-700">
              El año siguiente está preparado y las secciones fueron asignadas.
              Ya puedes activarlo cuando empiece el año escolar.
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};