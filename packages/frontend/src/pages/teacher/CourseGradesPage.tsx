import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Edit,
  FolderOpen,
  FileText,
  Users,
  Save,
} from 'lucide-react';
import { gradesApi } from '@/api/grades.api';
import { apiClient, getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { Course } from '@/types/course';
import type { Evaluation } from '@/types/grades';



export const CourseGradesPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sheetFor, setSheetFor] = useState<Evaluation | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Cargar el curso
  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await apiClient.get<Course>(`/courses/${courseId}`);
      return data;
    },
    enabled: !!courseId,
  });

  // Cargar categorías
  const { data: categoriesData } = useQuery({
    queryKey: ['grade-categories', courseId],
    queryFn: () => gradesApi.listCategories(courseId!),
    enabled: !!courseId,
  });

  // Cargar evaluaciones
  const { data: evaluationsData } = useQuery({
    queryKey: ['evaluations', courseId],
    queryFn: () => gradesApi.listEvaluationsByCourse(courseId!),
    enabled: !!courseId,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: gradesApi.deactivateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grade-categories', courseId] });
      setToast({ type: 'success', msg: 'Categoría desactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const deleteEvaluationMutation = useMutation({
    mutationFn: gradesApi.deactivateEvaluation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluations', courseId] });
      setToast({ type: 'success', msg: 'Evaluación desactivada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

  const totalWeight = (categoriesData?.items ?? [])
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + c.weight, 0);

  const evaluationsByCategory = (evaluationsData?.items ?? []).reduce(
    (acc, ev) => {
      if (!acc[ev.categoryId]) acc[ev.categoryId] = [];
      acc[ev.categoryId].push(ev);
      return acc;
    },
    {} as Record<string, Evaluation[]>,
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`rounded-lg p-3 text-sm ${
            toast.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div>
        <Link
          to="/my-courses"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Mis cursos
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Notas — {course?.subject.name}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {course?.section.gradeLevel?.name} "{course?.section.name}" · {course?.academicYear.year}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setEditingCategory(null);
                setIsCatModalOpen(true);
              }}
              icon={<FolderOpen className="w-4 h-4" />}
            >
              Nueva categoría
            </Button>
            <Button
              onClick={() => {
                setEditingEvaluation(null);
                setSelectedCategory(categoriesData?.items[0]?.id ?? '');
                setIsEvalModalOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
              disabled={!categoriesData?.items.length}
            >
              Nueva evaluación
            </Button>
          </div>
        </div>
      </div>

      {/* Advertencia sobre suma de pesos */}
      {totalWeight !== 100 && categoriesData && categoriesData.items.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          ⚠️ Los pesos de tus categorías suman <strong>{totalWeight}%</strong>. Se recomienda que sumen 100% para que el promedio final sea preciso.
        </div>
      )}

      {/* Listado de categorías con evaluaciones */}
      {!categoriesData || categoriesData.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aún no has creado categorías de evaluación.
          </p>
          <Button
            onClick={() => {
              setEditingCategory(null);
              setIsCatModalOpen(true);
            }}
          >
            Crear primera categoría
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {categoriesData.items
            .filter((c) => c.isActive)
            .map((category) => {
              const evals = evaluationsByCategory[category.id] ?? [];
              const totalEvalWeight = evals.reduce((s, e) => s + e.weight, 0);

              return (
                <div key={category.id} className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">{category.name}</h3>
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                          {category.weight}% del curso
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-500 mt-1">{category.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingCategory(category);
                          setIsCatModalOpen(true);
                        }}
                        icon={<Edit className="w-3 h-3" />}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (
                            confirm(
                              `¿Desactivar la categoría "${category.name}"?\n\nLas evaluaciones dentro se conservarán pero no se usarán en el promedio.`,
                            )
                          ) {
                            deleteCategoryMutation.mutate(category.id);
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelectedCategory(category.id);
                          setEditingEvaluation(null);
                          setIsEvalModalOpen(true);
                        }}
                        icon={<Plus className="w-3 h-3" />}
                      >
                        Evaluación
                      </Button>
                    </div>
                  </div>

                  {evals.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      Sin evaluaciones en esta categoría.
                    </div>
                  ) : (
                    <>
                      {totalEvalWeight !== 100 && (
                        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-100 text-xs text-yellow-800">
                          ⚠️ Los pesos de las evaluaciones suman {totalEvalWeight}% (deberían sumar 100%).
                        </div>
                      )}
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left font-medium px-4 py-2">Evaluación</th>
                            <th className="text-left font-medium px-4 py-2">Fecha</th>
                            <th className="text-right font-medium px-4 py-2">Peso</th>
                            <th className="text-right font-medium px-4 py-2">Nota máx</th>
                            <th className="text-right font-medium px-4 py-2">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {evals.map((ev) => (
                            <tr key={ev.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="font-medium text-gray-900">{ev.name}</div>
                                {ev.description && (
                                  <div className="text-xs text-gray-500">{ev.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-600">
                                {ev.evaluationDate
                                  ? new Date(ev.evaluationDate).toLocaleDateString('es-PE')
                                  : '—'}
                              </td>
                              <td className="px-4 py-3 text-right">{ev.weight}%</td>
                              <td className="px-4 py-3 text-right">{ev.maxScore}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => setSheetFor(ev)}
                                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                    title="Registrar notas"
                                  >
                                    <Users className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingEvaluation(ev);
                                      setSelectedCategory(ev.categoryId);
                                      setIsEvalModalOpen(true);
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm(`¿Desactivar la evaluación "${ev.name}"?`)) {
                                        deleteEvaluationMutation.mutate(ev.id);
                                      }
                                    }}
                                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Modal de categoría */}
      <CategoryModal
        open={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        courseId={courseId!}
        category={editingCategory}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['grade-categories', courseId] });
          setToast({
            type: 'success',
            msg: editingCategory ? 'Categoría actualizada' : 'Categoría creada',
          });
          setIsCatModalOpen(false);
        }}
      />

      {/* Modal de evaluación */}
      <EvaluationModal
        open={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        categoryId={selectedCategory}
        categories={categoriesData?.items ?? []}
        evaluation={editingEvaluation}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['evaluations', courseId] });
          setToast({
            type: 'success',
            msg: editingEvaluation ? 'Evaluación actualizada' : 'Evaluación creada',
          });
          setIsEvalModalOpen(false);
        }}
      />

      {/* Modal de planilla de notas */}
      {sheetFor && (
        <GradeSheetModal
          evaluation={sheetFor}
          onClose={() => {
            setSheetFor(null);
            queryClient.invalidateQueries({ queryKey: ['evaluations', courseId] });
          }}
        />
      )}
    </div>
  );
};

// ─── Modal de categoría ───────────────────────────────────────
const CategoryModal = ({
  open,
  onClose,
  courseId,
  category,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  courseId: string;
  category: any;
  onSuccess: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(0);
  const [orderIndex, setOrderIndex] = useState(0);

  useState(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description ?? '');
      setWeight(category.weight);
      setOrderIndex(category.orderIndex);
    } else {
      setName('');
      setDescription('');
      setWeight(0);
      setOrderIndex(0);
    }
  });

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, description, weight, orderIndex };
      if (category) {
        return gradesApi.updateCategory(category.id, payload);
      }
      return gradesApi.createCategory(courseId, payload);
    },
    onSuccess,
    onError: (err) => alert(getErrorMessage(err)),
  });

  // Sincronizar cuando cambie category
  if (open && category && name !== category.name) {
    setName(category.name);
    setDescription(category.description ?? '');
    setWeight(category.weight);
    setOrderIndex(category.orderIndex);
  } else if (open && !category && name !== '' && name !== undefined) {
    // No forzar reset cuando está vacío (acaba de abrir)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Editar categoría' : 'Nueva categoría'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Prácticas"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Peso (%) *"
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            hint="Suma de pesos de todas las categorías = 100%"
          />
          <Input
            label="Orden"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
          />
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal de evaluación ──────────────────────────────────────
const EvaluationModal = ({
  open,
  onClose,
  categoryId,
  categories,
  evaluation,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  categories: any[];
  evaluation: Evaluation | null;
  onSuccess: () => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [evaluationDate, setEvaluationDate] = useState('');
  const [weight, setWeight] = useState(0);
  const [maxScore, setMaxScore] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState(categoryId);

  if (open && evaluation && name !== evaluation.name) {
    setName(evaluation.name);
    setDescription(evaluation.description ?? '');
    setEvaluationDate(evaluation.evaluationDate ? evaluation.evaluationDate.substring(0, 10) : '');
    setWeight(evaluation.weight);
    setMaxScore(evaluation.maxScore);
    setSelectedCategory(evaluation.categoryId);
  } else if (open && !evaluation && name !== '') {
    // reset
  } else if (open && !evaluation && name === '' && selectedCategory !== categoryId) {
    setSelectedCategory(categoryId);
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || undefined,
        evaluationDate: evaluationDate || undefined,
        weight,
        maxScore,
      };
      if (evaluation) {
        return gradesApi.updateEvaluation(evaluation.id, payload);
      }
      return gradesApi.createEvaluation(selectedCategory, payload);
    },
    onSuccess,
    onError: (err) => alert(getErrorMessage(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={evaluation ? 'Editar evaluación' : 'Nueva evaluación'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!evaluation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              {categories
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.weight}%)
                  </option>
                ))}
            </select>
          </div>
        )}

        <Input
          label="Nombre *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Práctica 1"
        />
        <Input
          label="Fecha"
          type="date"
          value={evaluationDate}
          onChange={(e) => setEvaluationDate(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Peso en la categoría (%) *"
            type="number"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
          <Input
            label="Nota máxima *"
            type="number"
            value={maxScore}
            onChange={(e) => setMaxScore(Number(e.target.value))}
            hint="Generalmente 20 en Perú"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </div>
    </Modal>
  );
};

// ─── Modal de planilla de notas ───────────────────────────────
const GradeSheetModal = ({
  evaluation,
  onClose,
}: {
  evaluation: Evaluation;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['evaluation-sheet', evaluation.id],
    queryFn: () => gradesApi.getEvaluationSheet(evaluation.id),
  });

  const handleChange = (studentId: string, value: string) => {
    setEdits((prev) => ({ ...prev, [studentId]: value }));
  };

  const handleSave = async () => {
    const grades = Object.entries(edits)
      .filter(([, v]) => v !== '')
      .map(([studentId, value]) => ({
        studentId,
        score: Number(value),
      }));

    if (grades.length === 0) {
      alert('No hay cambios que guardar');
      return;
    }

    setSaving(true);
    try {
      const result = await gradesApi.bulkGrades(evaluation.id, grades);
      alert(`✅ ${result.saved} nota(s) guardada(s)${result.failed ? `, ${result.failed} con error` : ''}`);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['evaluation-sheet', evaluation.id] });
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Registrar notas — ${evaluation.name}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleSave} loading={saving} icon={<Save className="w-4 h-4" />}>
            Guardar cambios
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : !sheet || sheet.rows.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          No hay estudiantes matriculados en este curso.
        </div>
      ) : (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 mb-4">
            Nota máxima: <strong>{sheet.evaluation.maxScore}</strong> · Peso: {sheet.evaluation.weight}%
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Estudiante</th>
                  <th className="text-left font-medium px-4 py-2">DNI</th>
                  <th className="text-left font-medium px-4 py-2 w-32">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheet.rows.map((row) => {
                  const currentValue = edits[row.student.id] ?? row.grade?.score?.toString() ?? '';
                  const hasEdit = edits[row.student.id] !== undefined;

                  return (
                    <tr key={row.student.id} className={hasEdit ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-2">
                        {row.student.lastName}, {row.student.firstName}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{row.student.dni}</td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          max={sheet.evaluation.maxScore}
                          step="0.1"
                          value={currentValue}
                          onChange={(e) => handleChange(row.student.id, e.target.value)}
                          className="w-24 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
};