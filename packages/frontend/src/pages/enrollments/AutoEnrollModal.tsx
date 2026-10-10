import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, Search, Users } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { enrollmentsApi } from '@/api/enrollments.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { AutoEnrollSectionResponse } from '@/types/enrollment';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Section = {
  id: string;
  name: string;
  academicYearId: string;
  academicYear?: { year: number };
  gradeLevel?: { name: string };
};

export const AutoEnrollModal = ({ open, onClose, onSuccess }: Props) => {
  const [sectionId, setSectionId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<AutoEnrollSectionResponse | null>(null);

  // Cargar secciones
  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-auto-enroll'],
    queryFn: async () => {
      const { data } = await apiClient.get<Section[]>('/academic/sections', {
        params: { active: 'true' },
      });
      return data;
    },
    enabled: open,
  });

  // Cargar estudiantes disponibles (depende de la sección)
  const { data: availableData, isLoading: loadingStudents } = useQuery({
    queryKey: ['available-students', sectionId],
    queryFn: () => enrollmentsApi.availableStudentsForSection(sectionId),
    enabled: open && !!sectionId,
  });

  const sectionOptions: SearchableOption[] = useMemo(
    () =>
      (sectionsData ?? []).map((s) => ({
        value: s.id,
        label: `${s.gradeLevel?.name ?? ''} "${s.name}" (${s.academicYear?.year ?? ''})`,
      })),
    [sectionsData],
  );

  // Resetear al abrir
  useEffect(() => {
    if (open) {
      setSectionId('');
      setSearch('');
      setSelectedIds(new Set());
      setResult(null);
    }
  }, [open]);

  // Limpiar selección al cambiar sección
  useEffect(() => {
    setSelectedIds(new Set());
    setSearch('');
  }, [sectionId]);

  const filteredStudents = useMemo(() => {
    const list = availableData?.items ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.dni.toLowerCase().includes(q) ||
        (s.email ?? '').toLowerCase().includes(q),
    );
  }, [availableData, search]);

  const toggleStudent = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) deselectAll();
    else selectAll();
  };

  const mutation = useMutation({
    mutationFn: enrollmentsApi.autoEnroll,
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleSubmit = () => {
    if (!sectionId) {
      alert('Debes seleccionar una sección');
      return;
    }
    if (selectedIds.size === 0) {
      alert('Marca al menos un estudiante');
      return;
    }
    mutation.mutate({
      sectionId,
      studentIds: Array.from(selectedIds),
    });
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Matriculación completada' : 'Auto-matricular sección'}
      size="2xl"
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
              disabled={selectedIds.size === 0 || !sectionId}
            >
              Matricular {selectedIds.size} estudiante(s)
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
                ✅ {result.studentsProcessed} estudiante(s) procesado(s)
              </div>
              <div>
                Se crearon <strong>{result.enrollmentsCreated}</strong> matrículas nuevas.
              </div>
              {result.enrollmentsSkipped > 0 && (
                <div className="text-yellow-700 mt-1">
                  ⏭️ {result.enrollmentsSkipped} ya existían y se omitieron
                </div>
              )}
              {result.enrollmentsErrors > 0 && (
                <div className="text-red-700 mt-1">
                  ❌ {result.enrollmentsErrors} con errores
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Cada estudiante seleccionado será matriculado en <strong>todos los cursos
            activos</strong> de la sección. Los que ya estén matriculados se omitirán.
          </div>

          {/* Sección */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sección *
            </label>
            <SearchableSelect
              options={sectionOptions}
              value={sectionId}
              onChange={setSectionId}
              placeholder="Buscar sección..."
              searchPlaceholder="Escribe grado o letra..."
              emptyMessage="No hay secciones que coincidan"
            />
          </div>

          {/* Estudiantes */}
          {sectionId && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-900">
                    Estudiantes disponibles
                  </span>
                  <span className="text-xs text-gray-500">
                    ({availableData?.total ?? 0})
                  </span>
                </div>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-medium text-primary-600">
                    {selectedIds.size} seleccionado(s)
                  </span>
                )}
              </div>

              {/* Buscador */}
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, DNI o email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={toggleSelectAll}
                  disabled={filteredStudents.length === 0}
                >
                  {allFilteredSelected ? 'Quitar todos' : 'Seleccionar todos'}
                </Button>
              </div>

              {/* Lista */}
              {loadingStudents ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Cargando estudiantes...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm border border-dashed border-gray-300 rounded-lg">
                  {search
                    ? 'No hay estudiantes que coincidan con la búsqueda'
                    : 'Todos los estudiantes activos ya están matriculados en esta sección'}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[65vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 sticky top-0">
                      <tr>
                        <th className="w-12 px-3 py-2"></th>
                        <th className="text-left font-medium px-3 py-2">Nombre</th>
                        <th className="text-left font-medium px-3 py-2">DNI</th>
                        <th className="text-left font-medium px-3 py-2">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((s) => {
                        const checked = selectedIds.has(s.id);
                        return (
                          <tr
                            key={s.id}
                            onClick={() => toggleStudent(s.id)}
                            className={`cursor-pointer ${
                              checked ? 'bg-primary-50/40' : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStudent(s.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                            </td>
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {s.fullName}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{s.dni}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {s.email ?? '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};