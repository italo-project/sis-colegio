import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { SearchableSelect, type SearchableOption } from '@/components/ui/SearchableSelect';
import { coursesApi } from '@/api/courses.api';
import { apiClient, getErrorMessage } from '@/api/client';
import type { AutoGenerateCoursesResponse } from '@/types/course';

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

type Subject = {
  id: string;
  code: string;
  name: string;
  area: string | null;
};

type Teacher = {
  id: string;
  fullName: string;
  dni: string;
};

type RowState = {
  selected: boolean;
  teacherId: string;
  weeklyHours: string;
};

export const AutoGenerateCoursesModal = ({ open, onClose, onSuccess }: Props) => {
  const [sectionId, setSectionId] = useState('');
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [result, setResult] = useState<AutoGenerateCoursesResponse | null>(null);

  // Cargar secciones
  const { data: sectionsData } = useQuery({
    queryKey: ['sections-for-auto-courses'],
    queryFn: async () => {
      const { data } = await apiClient.get<Section[]>('/academic/sections', {
        params: { active: 'true' },
      });
      return data;
    },
    enabled: open,
  });

  // Cargar materias
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-for-auto-courses'],
    queryFn: async () => {
      const { data } = await apiClient.get<Subject[] | { items: Subject[] }>('/subjects', {
        params: { active: 'true' },
      });
      return Array.isArray(data) ? data : data.items;
    },
    enabled: open,
  });

  // Cargar docentes
  const { data: teachersData } = useQuery({
    queryKey: ['teachers-for-auto-courses'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items: Teacher[] }>('/teachers', {
        params: { active: 'true', limit: 1000 },
      });
      return data.items;
    },
    enabled: open,
  });

  const sectionOptions: SearchableOption[] = useMemo(
    () =>
      (sectionsData ?? []).map((s) => ({
        value: s.id,
        label: `${s.gradeLevel?.name ?? ''} "${s.name}" (${s.academicYear?.year ?? ''})`,
      })),
    [sectionsData],
  );

  const teacherOptions: SearchableOption[] = useMemo(
    () => [
      { value: '', label: 'Sin asignar' },
      ...(teachersData ?? []).map((t) => ({
        value: t.id,
        label: t.fullName,
        keywords: t.dni,
      })),
    ],
    [teachersData],
  );

  // Inicializar filas cuando lleguen las materias
  useEffect(() => {
    if (open && subjectsData && Object.keys(rows).length === 0) {
      const initial: Record<string, RowState> = {};
      subjectsData.forEach((s) => {
        initial[s.id] = { selected: false, teacherId: '', weeklyHours: '' };
      });
      setRows(initial);
    }
  }, [open, subjectsData, rows]);

  useEffect(() => {
    if (open) {
      setSectionId('');
      setResult(null);
    }
  }, [open]);

  const toggleRow = (subjectId: string) => {
    setRows((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], selected: !prev[subjectId].selected },
    }));
  };

  const updateRow = (subjectId: string, patch: Partial<RowState>) => {
    setRows((prev) => ({
      ...prev,
      [subjectId]: { ...prev[subjectId], ...patch },
    }));
  };

  const selectedCount = Object.values(rows).filter((r) => r.selected).length;

  const mutation = useMutation({
    mutationFn: coursesApi.autoGenerate,
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
    if (selectedCount === 0) {
      alert('Marca al menos una materia');
      return;
    }

    const courses = Object.entries(rows)
      .filter(([, r]) => r.selected)
      .map(([subjectId, r]) => ({
        subjectId,
        teacherId: r.teacherId || null,
        weeklyHours: r.weeklyHours ? Number(r.weeklyHours) : null,
      }));

    mutation.mutate({ sectionId, courses });
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Cursos generados' : 'Auto-generar cursos'}
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
              disabled={selectedCount === 0}
            >
              Crear {selectedCount} curso(s)
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
                ✅ {result.created} curso(s) creado(s)
              </div>
              {result.skipped > 0 && (
                <div className="text-yellow-700 mt-1">
                  ⏭️ {result.skipped} omitido(s) porque ya existían
                </div>
              )}
              {result.failed > 0 && (
                <div className="text-red-700 mt-1">❌ {result.failed} con errores</div>
              )}
            </div>
          </div>

          {result.skipped_courses.length > 0 && (
            <div className="border border-yellow-200 rounded-lg overflow-hidden">
              <div className="bg-yellow-50 px-4 py-2 text-xs font-medium text-yellow-800 border-b border-yellow-200">
                Cursos omitidos
              </div>
              <ul className="divide-y divide-yellow-100 text-sm">
                {result.skipped_courses.map((s, i) => (
                  <li key={i} className="px-4 py-2 text-yellow-800">
                    {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-red-50 px-4 py-2 text-xs font-medium text-red-700 border-b border-red-200">
                Errores
              </div>
              <ul className="divide-y divide-red-100 text-sm">
                {result.errors.map((e, i) => (
                  <li key={i} className="px-4 py-2 text-red-700">
                    {e.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Crea varios cursos a la vez para una misma sección. Los cursos que ya existan
            se omitirán automáticamente.
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

          {/* Materias */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                Materias y docentes
              </label>
              <span className="text-xs text-gray-500">
                {selectedCount} seleccionada(s)
              </span>
            </div>

            {!subjectsData || subjectsData.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No hay materias registradas. Créalas primero en "Asignaturas".
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0">
                    <tr>
                      <th className="w-12 px-3 py-2"></th>
                      <th className="text-left font-medium px-3 py-2">Materia</th>
                      <th className="text-left font-medium px-3 py-2 w-64">Docente</th>
                      <th className="text-left font-medium px-3 py-2 w-24">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subjectsData.map((s) => {
                      const row = rows[s.id];
                      if (!row) return null;
                      return (
                        <tr key={s.id} className={row.selected ? 'bg-primary-50/30' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={row.selected}
                              onChange={() => toggleRow(s.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900">{s.name}</div>
                            <div className="text-xs text-gray-500">
                              {s.code}
                              {s.area && ` · ${s.area}`}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <SearchableSelect
                              options={teacherOptions}
                              value={row.teacherId}
                              onChange={(val) => updateRow(s.id, { teacherId: val })}
                              placeholder="Sin asignar"
                              searchPlaceholder="Buscar docente..."
                              emptyMessage="No hay docentes"
                              disabled={!row.selected}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              max={40}
                              value={row.weeklyHours}
                              onChange={(e) =>
                                updateRow(s.id, { weeklyHours: e.target.value })
                              }
                              placeholder="—"
                              disabled={!row.selected}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm disabled:bg-gray-50"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};