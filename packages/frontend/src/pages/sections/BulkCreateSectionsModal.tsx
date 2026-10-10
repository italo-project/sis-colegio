import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { sectionsApi } from '@/api/sections.api';
import { getErrorMessage } from '@/api/client';
import type { BulkCreateSectionsResponse } from '@/types/section';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export const BulkCreateSectionsModal = ({ open, onClose, onSuccess }: Props) => {
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [capacity, setCapacity] = useState<string>('');
  const [names, setNames] = useState<string[]>(['A', 'B', 'C']);
  const [result, setResult] = useState<BulkCreateSectionsResponse | null>(null);
  const [conflicts, setConflicts] = useState<Array<{ row: number; value: string }>>([]);

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
      setAcademicYearId('');
      setGradeLevelId('');
      setCapacity('');
      setNames(['A', 'B', 'C']);
      setResult(null);
      setConflicts([]);
    }
  }, [open]);

  // Selecciona el año activo por defecto
  useEffect(() => {
    if (open && years && !academicYearId) {
      const active = years.find((y) => y.isActive);
      if (active) setAcademicYearId(active.id);
    }
  }, [open, years, academicYearId]);

  const mutation = useMutation({
    mutationFn: sectionsApi.bulkCreate,
    onSuccess: (data) => {
      setResult(data);
      onSuccess();
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      if (resp?.conflicts) setConflicts(resp.conflicts);
      alert(getErrorMessage(err));
    },
  });

  const addName = () => setNames([...names, '']);
  const removeName = (idx: number) => {
    if (names.length === 1) return;
    setNames(names.filter((_, i) => i !== idx));
    setConflicts([]);
  };
  const updateName = (idx: number, val: string) => {
    setNames(names.map((n, i) => (i === idx ? val.toUpperCase() : n)));
    if (conflicts.length > 0) setConflicts([]);
  };

  const getRowConflict = (idx: number) =>
    conflicts.find((c) => c.row === idx + 1);

  const handleSubmit = () => {
    if (!academicYearId) {
      alert('Debes seleccionar un año escolar');
      return;
    }
    if (!gradeLevelId) {
      alert('Debes seleccionar un grado');
      return;
    }
    const validNames = names.map((n) => n.trim()).filter((n) => n.length > 0);
    if (validNames.length === 0) {
      alert('Agrega al menos una sección con nombre');
      return;
    }
    mutation.mutate({
      academicYearId,
      gradeLevelId,
      capacity: capacity ? Number(capacity) : undefined,
      names: validNames,
    });
  };

  const handleClose = () => {
    setResult(null);
    setConflicts([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={result ? 'Secciones creadas' : 'Crear secciones (masivo)'}
      size="lg"
      footer={
        result ? (
          <Button onClick={handleClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} loading={mutation.isPending}>
              Crear {names.filter((n) => n.trim()).length} sección(es)
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
                ✅ {result.created} sección(es) creada(s)
              </div>
              <div>Las secciones ya están disponibles para asignar cursos y matricular alumnos.</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 border-b">
              Secciones creadas
            </div>
            <ul className="divide-y divide-gray-100">
              {result.sections.map((s) => (
                <li key={s.id} className="px-4 py-2 text-sm flex items-center gap-2">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    {s.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            Crea varias secciones a la vez para un mismo grado y año escolar.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Año escolar *
              </label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Selecciona...</option>
                {years?.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.year} {y.isActive ? '(activo)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grado *
              </label>
              <select
                value={gradeLevelId}
                onChange={(e) => setGradeLevelId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">Selecciona...</option>
                {grades?.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Capacidad"
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="30"
              hint="Opcional"
            />
          </div>

          {/* Nombres de las secciones */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-900">
                Nombres de las secciones *
              </label>
              <span className="text-xs text-gray-500">
                {names.filter((n) => n.trim()).length} secciones
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {names.map((name, idx) => {
                const conflict = getRowConflict(idx);
                return (
                  <div key={idx} className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => updateName(idx, e.target.value)}
                      maxLength={10}
                      placeholder="A"
                      className={`w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 outline-none text-sm text-center font-medium uppercase ${
                        conflict
                          ? 'border-red-400 focus:ring-red-500 bg-red-50'
                          : 'border-gray-300 focus:ring-primary-500'
                      }`}
                    />
                    {names.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeName(idx)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {conflict && (
                      <p className="text-xs text-red-600 mt-1 absolute -bottom-5 left-0">
                        Ya existe
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addName}
              className="mt-4 flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors w-full justify-center border-2 border-dashed border-primary-200"
            >
              <Plus className="w-4 h-4" />
              Añadir otra sección
            </button>
          </div>

          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
            <strong>Tip:</strong> suele usarse una letra por sección: A, B, C, D, etc.
            Todas las secciones tendrán el mismo grado y año escolar.
          </div>
        </div>
      )}
    </Modal>
  );
};