import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, Plus, Eye, Trash2, Lock } from 'lucide-react';
import { attendanceApi } from '@/api/attendance.api';
import { getErrorMessage, apiClient } from '@/api/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDateEs } from '@/lib/dates';
import type { AttendanceSession } from '@/types/grades';
import { useAuthStore } from '@/stores/auth.store';
import { AttendanceSheetModal } from './AttendanceSheetModal';

const getTodayString = (): string => {
  const now = new Date();
  const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const year = peruTime.getFullYear();
  const month = String(peruTime.getMonth() + 1).padStart(2, '0');
  const day = String(peruTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type SectionDetail = {
  id: string;
  name: string;
  tutorUserId: string | null;
  gradeLevel?: { name: string };
  academicYear?: { year: number };
};

export const SectionAttendancePage = () => {
  const { sectionId } = useParams<{ sectionId: string }>();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [sheetFor, setSheetFor] = useState<AttendanceSession | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isCeo = role === 'ceo';
  const today = getTodayString();

  const { data: section } = useQuery({
    queryKey: ['section-detail', sectionId],
    queryFn: async () => {
      const { data } = await apiClient.get<SectionDetail>(`/academic/sections/${sectionId}`);
      return data;
    },
    enabled: !!sectionId,
  });

  const isTutor = !!(section && currentUserId && section.tutorUserId === currentUserId);
  const canCreateAttendance = isCeo || isTutor;

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['attendance-sessions', sectionId],
    queryFn: () => attendanceApi.listSessions({ sectionId }),
    enabled: !!sectionId,
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
          to={isCeo ? '/sections' : '/my-sections'}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {isCeo ? 'Secciones' : 'Mis secciones'}
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Asistencias — {section?.gradeLevel?.name} "{section?.name}"
            </h1>
            <p className="text-sm text-gray-500 mt-1">{section?.academicYear?.year}</p>
          </div>

          {canCreateAttendance && (
            <Button
              onClick={() => setIsCreateOpen(true)}
              icon={<Plus className="w-4 h-4" />}
              disabled={!section}
            >
              Tomar asistencia de hoy
            </Button>
          )}
        </div>
      </div>

      {!canCreateAttendance ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 flex items-start gap-2">
          <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            Solo el tutor de esta sección o el CEO pueden tomar asistencia. Puedes ver el historial
            a continuación.
          </span>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <strong>Reglas:</strong> La asistencia solo se puede tomar del día de hoy. Puedes
          guardar cambios como borrador o cerrar la sesión definitivamente (notifica a los
          padres por WhatsApp).
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-gray-500 text-sm">Cargando...</div>
      ) : !sessionsData || sessionsData.items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">
            Aún no se ha tomado asistencia para esta sección.
          </p>
          {canCreateAttendance && (
            <Button onClick={() => setIsCreateOpen(true)}>Tomar la primera asistencia</Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left font-medium px-4 py-3">Fecha</th>
                <th className="text-left font-medium px-4 py-3">Tema</th>
                <th className="text-left font-medium px-4 py-3">Estado</th>
                <th className="text-left font-medium px-4 py-3">Registrado</th>
                <th className="text-right font-medium px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessionsData.items.map((session) => {
                const sessionDate = String(session.sessionDate).substring(0, 10);
                const isToday = sessionDate === today;
                const canEdit = !session.isFinal && (isCeo || (isTutor && isToday));

                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatDateEs(sessionDate)}
                      {isToday && (
                        <span className="ml-2 inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                          Hoy
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{session.topic ?? '—'}</td>
                    <td className="px-4 py-3">
                      {session.isFinal ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                          <Lock className="w-3 h-3" />
                          Cerrada
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                          Borrador
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(session.createdAt).toLocaleString('es-PE')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSheetFor(session)}
                          className={`p-1.5 rounded transition-colors ${
                            canEdit
                              ? 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                              : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                          }`}
                          title={canEdit ? 'Ver / editar' : 'Ver (solo lectura)'}
                        >
                          {canEdit ? <Eye className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        {isCeo && (
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar esta sesión de asistencia?')) {
                                deleteMutation.mutate(session.id);
                              }
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Eliminar (solo CEO)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isCreateOpen && sectionId && (
        <CreateSessionModal
          sectionId={sectionId}
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
          canEditSession={isCeo || isTutor}
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
  const today = getTodayString();
  const [topic, setTopic] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      attendanceApi.createSession({
        sectionId,
        sessionDate: today,
        topic: topic || undefined,
      }),
    onSuccess: (data) => onSuccess(data),
    onError: (err) => alert(getErrorMessage(err)),
  });

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Tomar asistencia de hoy"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          <strong>Fecha:</strong> {formatDateEs(today)}
          <p className="mt-1 text-xs">Solo puedes tomar la asistencia del día de hoy.</p>
        </div>

        <Input
          label="Tema (opcional)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Formación general"
        />
      </div>
    </Modal>
  );
};