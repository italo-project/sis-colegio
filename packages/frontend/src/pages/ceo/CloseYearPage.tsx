import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Award,
  Users,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';
import { closeYearApi } from '@/api/close-year.api';
import { sectionsApi } from '@/api/sections.api';
import { Button } from '@/components/ui/Button';
import { getErrorMessage } from '@/api/client';
import { PreloadNextYearModal } from './PreloadNextYearModal';
import type { SuggestedStatus } from '@/types/close-year';

const statusLabels: Record<SuggestedStatus, string> = {
  promoted: 'Promovido',
  repeated: 'Repite',
  graduated: 'Egresado',
  transferred: 'Transferido',
};

const statusColors: Record<SuggestedStatus, string> = {
  promoted: 'bg-green-100 text-green-700',
  repeated: 'bg-red-100 text-red-700',
  graduated: 'bg-blue-100 text-blue-700',
  transferred: 'bg-gray-100 text-gray-700',
};

type FilterType = 'all' | 'promoted' | 'repeated' | 'graduated' | 'transferred';

export const CloseYearPage = () => {
  const queryClient = useQueryClient();
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [decisions, setDecisions] = useState<Record<string, SuggestedStatus>>({});
  const [isPreloadOpen, setIsPreloadOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: sectionsApi.listAcademicYears,
  });

  useMemo(() => {
    if (years && !selectedYearId) {
      const active = years.find((y) => y.isActive) ?? years[0];
      if (active) setSelectedYearId(active.id);
    }
  }, [years, selectedYearId]);

  const {
    data: candidatesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['close-year-candidates', selectedYearId],
    queryFn: () => closeYearApi.listCandidates(selectedYearId),
    enabled: !!selectedYearId,
  });

  const closeMutation = useMutation({
    mutationFn: closeYearApi.closeYear,
    onSuccess: (data) => {
      if (data.errors.length > 0) {
        setToast({
          type: 'error',
          msg: `Cerrado con ${data.errors.length} error(es). Revisa los detalles.`,
        });
      } else {
        setToast({
          type: 'success',
          msg: `Año escolar cerrado. ${data.inserted} decisiones registradas.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['academic-years'] });
      queryClient.invalidateQueries({ queryKey: ['close-year-candidates'] });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const handleApplySuggestions = () => {
    if (!candidatesData) return;
    const auto: Record<string, SuggestedStatus> = {};
    for (const c of candidatesData.candidates) {
      auto[c.studentId] = c.suggestedStatus;
    }
    setDecisions(auto);
  };

  const handleChange = (studentId: string, status: SuggestedStatus) => {
    setDecisions((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleCloseYear = () => {
    if (!selectedYearId || !candidatesData) return;

    const list = candidatesData.candidates.map((c) => ({
      studentId: c.studentId,
      status: decisions[c.studentId] ?? c.suggestedStatus,
    }));

    const missing = list.filter((l) => !l.status);
    if (missing.length > 0) {
      alert(`Faltan ${missing.length} decisiones`);
      return;
    }

    const confirmed = confirm(
      `¿Cerrar el año escolar ${candidatesData.academicYear.year}?\n\n` +
        `Se registrarán ${list.length} decisiones. Esta acción NO se puede deshacer.`,
    );
    if (!confirmed) return;

    closeMutation.mutate({ academicYearId: selectedYearId, decisions: list });
  };

  const filtered = useMemo(() => {
    if (!candidatesData) return [];
    return candidatesData.candidates.filter((c) => {
      if (filter === 'all') return true;
      const status = decisions[c.studentId] ?? c.suggestedStatus;
      return status === filter;
    });
  }, [candidatesData, filter, decisions]);

  const totals = useMemo(() => {
    if (!candidatesData)
      return { total: 0, promoted: 0, repeated: 0, graduated: 0, transferred: 0 };
    const result = { total: 0, promoted: 0, repeated: 0, graduated: 0, transferred: 0 };
    for (const c of candidatesData.candidates) {
      const s = decisions[c.studentId] ?? c.suggestedStatus;
      result.total++;
      result[s]++;
    }
    return result;
  }, [candidatesData, decisions]);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm flex items-center gap-2 ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div>
        <Link
          to="/sections"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Secciones
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cierre de Año Escolar</h1>
            <p className="text-sm text-gray-500 mt-1">
              Decide quién pasa, quién repite y quién egresa.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setIsPreloadOpen(true)}
            disabled={!selectedYearId}
          >
            Precargar año siguiente
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Año escolar
          </label>
          <select
            value={selectedYearId}
            onChange={(e) => {
              setSelectedYearId(e.target.value);
              setDecisions({});
              setFilter('all');
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          >
            <option value="">Selecciona...</option>
            {years?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year} {y.isActive ? '(activo)' : ''}
              </option>
            ))}
          </select>
        </div>

        {candidatesData && (
          <>
            <div className="flex-1" />
            <Button
              variant="secondary"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={handleApplySuggestions}
            >
              Aplicar sugerencias
            </Button>
            <Button
              variant="secondary"
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => setDecisions({})}
            >
              Reiniciar
            </Button>
          </>
        )}
      </div>

      {candidatesData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Total</span>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{totals.total}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Promovidos</span>
              <Award className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{totals.promoted}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Repiten</span>
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-bold text-red-600">{totals.repeated}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Egresan</span>
              <CheckCircle className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{totals.graduated}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Transferidos</span>
              <ArrowLeft className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{totals.transferred}</div>
          </div>
        </div>
      )}

      {candidatesData && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({totals.total})
            </button>
            <button
              onClick={() => setFilter('promoted')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'promoted'
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Promovidos ({totals.promoted})
            </button>
            <button
              onClick={() => setFilter('repeated')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'repeated'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Repiten ({totals.repeated})
            </button>
            <button
              onClick={() => setFilter('graduated')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'graduated'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Egresados ({totals.graduated})
            </button>
            <button
              onClick={() => setFilter('transferred')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'transferred'
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Transferidos ({totals.transferred})
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {!selectedYearId ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            Selecciona un año escolar para empezar.
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Cargando candidatos...</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-600 text-sm">
            {error instanceof Error ? error.message : 'Error al cargar candidatos'}
          </div>
        ) : !candidatesData || candidatesData.candidates.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No hay estudiantes activos en este año escolar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Estudiante</th>
                  <th className="text-left font-medium px-4 py-3">DNI</th>
                  <th className="text-left font-medium px-4 py-3">Sección actual</th>
                  <th className="text-right font-medium px-4 py-3">Promedio</th>
                  <th className="text-left font-medium px-4 py-3">Sugerencia</th>
                  <th className="text-left font-medium px-4 py-3">Decisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const currentStatus = decisions[c.studentId] ?? c.suggestedStatus;
                  const isModified = decisions[c.studentId] !== undefined;

                  return (
                    <tr key={c.studentId} className={isModified ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{c.dni}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {c.section
                          ? `${c.section.gradeLevel.name} "${c.section.name}"`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.finalAverage !== null ? (
                          <span
                            className={`font-bold ${
                              c.finalAverage >= 11 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {c.finalAverage.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[c.suggestedStatus]
                          }`}
                        >
                          {statusLabels[c.suggestedStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleChange(c.studentId, e.target.value as SuggestedStatus)
                          }
                          className={`px-2 py-1 border rounded-lg text-sm outline-none ${
                            isModified
                              ? 'border-yellow-400 bg-yellow-50'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="promoted">Promovido</option>
                          <option value="repeated">Repite</option>
                          <option value="graduated">Egresado</option>
                          <option value="transferred">Transferido</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {candidatesData && candidatesData.candidates.length > 0 && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-4">
            <div className="text-sm text-gray-600">
              <strong className="text-gray-900">{totals.total}</strong> decisiones listas
            </div>
            <Button
              onClick={handleCloseYear}
              loading={closeMutation.isPending}
              icon={<Save className="w-4 h-4" />}
            >
              Confirmar cierre de año
            </Button>
          </div>
        </div>
      )}

      <PreloadNextYearModal
        open={isPreloadOpen}
        onClose={() => setIsPreloadOpen(false)}
        fromAcademicYearId={selectedYearId}
        currentYear={candidatesData?.academicYear.year ?? null}
        onSuccess={() => {
          setIsPreloadOpen(false);
          setToast({
            type: 'success',
            msg: 'Año siguiente creado. Ya puedes asignar secciones a los promovidos.',
          });
          queryClient.invalidateQueries({ queryKey: ['academic-years'] });
        }}
      />
    </div>
  );
};