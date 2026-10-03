import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Plus, Eye, Trash2, Users } from 'lucide-react';
import { attendanceApi } from '@/api/attendance.api';
import { getErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type { AttendanceSession, AttendanceStatus } from '@/types/grades';
import { apiClient } from '@/api/client';
import type { Course } from '@/types/course';

const formatDateEs = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.substring(0, 10).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Asistió',
  late: 'Tardanza',
  absent: 'Faltó',
};

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-yellow-100 text-yellow-700',
  absent: 'bg-red-100 text-red-700',
};

export const CourseAttendancePage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sheetFor, setSheetFor] = useState<AttendanceSession | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await apiClient.get<Course>(`/courses/${courseId}`);
      return data;
    },
    enabled: !!courseId,
  });

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['attendance-sessions', course?.sectionId],
    queryFn: () => attendanceApi.listSessions({ sectionId: course?.sectionId }),
    enabled: !!course?.sectionId,
  });

  const deleteMutation = useMutation({
    mutationFn: attendanceApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
      setToast({ type: 'success', msg: 'Sesión eliminada' });
    },
    onError: (err) => setToast({ type: 'error', msg: getErrorMessage(err) }),
  });

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
              Asistencia — {course?.section.gradeLevel?.name} "{course?.section.name}"
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Sección de {course?.subject.name}
            </p>
          </div>

          <Button
            onClick={() => setIsCreateOpen(true)}
            icon={<Plus className="w-4 h-4" />}
            disabled={!course}
          >
            Tomar asistencia
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
      ) : !sessionsData || sessionsData.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aún no has tomado asistencia para esta sección.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>Tomar la primera asistencia</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Fecha</th>
                <th className="text-left font-medium px-4 py-3">Tema</th>
                <th className="text-left font-medium px-4 py-3">Registrado</th>
                <th className="text-right font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessionsData.items.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
  {formatDateEs(session.sessionDate)}
</td>
                  <td className="px-4 py-3 text-gray-600">{session.topic ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(session.createdAt).toLocaleString('es-PE')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSheetFor(session)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Ver / editar"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta sesión de asistencia?')) {
                            deleteMutation.mutate(session.id);
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
        </div>
      )}

      {isCreateOpen && course && (
        <CreateSessionModal
          sectionId={course.sectionId}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(session) => {
            queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
            setIsCreateOpen(false);
            setSheetFor(session);
          }}
        />
      )}

      {sheetFor && (
        <AttendanceSheetModal
          sessionId={sheetFor.id}
          onClose={() => {
            setSheetFor(null);
            queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
          }}
        />
      )}
    </div>
  );
};

// ─── Modal de crear sesión ────────────────────────────────────
const CreateSessionModal = ({
  sectionId,
  onClose,
  onSuccess,
}: {
  sectionId: string;
  onClose: () => void;
  onSuccess: (session: AttendanceSession) => void;
}) => {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [topic, setTopic] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      attendanceApi.createSession({
        sectionId,
        sessionDate,
        topic: topic || undefined,
      }),
    onSuccess: (data) => onSuccess(data),
    onError: (err) => alert(getErrorMessage(err)),
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Tomar asistencia"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Crear y marcar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Fecha *"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
        />
        <Input
          label="Tema (opcional)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Álgebra - Ecuaciones"
        />
      </div>
    </Modal>
  );
};

// ─── Modal de planilla de asistencia ─────────────────────────
const AttendanceSheetModal = ({
  sessionId,
  onClose,
}: {
  sessionId: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['attendance-sheet', sessionId],
    queryFn: () => attendanceApi.getSession(sessionId),
  });

  const handleChange = (studentId: string, status: AttendanceStatus) => {
    setEdits((prev) => ({ ...prev, [studentId]: status }));
  };

  const handleSave = async () => {
    const records = Object.entries(edits).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    if (records.length === 0) {
      alert('No hay cambios que guardar');
      return;
    }

    setSaving(true);
    try {
      const result = await attendanceApi.bulkRecords(sessionId, records);
      alert(`✅ ${result.saved} registro(s) guardado(s)`);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet', sessionId] });
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const getStatusFor = (studentId: string, currentStatus: string | undefined): AttendanceStatus => {
    return edits[studentId] ?? (currentStatus as AttendanceStatus) ?? 'present';
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Asistencia — ${sheet ? formatDateEs(sheet.session.sessionDate) : ''}`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar cambios
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="p-8 text-center text-gray-500">Cargando...</div>
      ) : !sheet ? (
        <div className="p-8 text-center text-gray-500">Sesión no encontrada</div>
      ) : (
        <div>
          {sheet.summary && (
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-green-700">{sheet.summary.present}</div>
                <div className="text-xs text-green-600">Asistieron</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-yellow-700">{sheet.summary.late}</div>
                <div className="text-xs text-yellow-600">Tardanzas</div>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-red-700">{sheet.summary.absent}</div>
                <div className="text-xs text-red-600">Faltas</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-gray-700">{sheet.summary.notRecorded}</div>
                <div className="text-xs text-gray-600">Sin marcar</div>
              </div>
            </div>
          )}

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left font-medium px-4 py-2">Estudiante</th>
                  <th className="text-right font-medium px-4 py-2 w-64">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sheet.rows.map((row) => {
                  const status = getStatusFor(row.student.id, row.record?.status);
                  const hasEdit = edits[row.student.id] !== undefined;

                  return (
                    <tr key={row.student.id} className={hasEdit ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-2">
                        {row.student.lastName}, {row.student.firstName}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {(['present', 'late', 'absent'] as AttendanceStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleChange(row.student.id, s)}
                              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                status === s
                                  ? s === 'present'
                                    ? 'bg-green-600 text-white'
                                    : s === 'late'
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-red-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {statusLabels[s]}
                            </button>
                          ))}
                        </div>
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