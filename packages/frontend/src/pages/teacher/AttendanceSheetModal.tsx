import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Save, XCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { attendanceApi } from '@/api/attendance.api';
import { getErrorMessage } from '@/api/client';
import { formatDateEs } from '@/lib/dates';
import type { AttendanceStatus } from '@/types/grades';
import { useAuthStore } from '@/stores/auth.store';
import { CloseSessionModal } from './CloseSessionModal';
import { SendWhatsAppResultModal } from './SendWhatsAppResultModal';

const statusLabels: Record<AttendanceStatus, string> = {
  present: 'Asistió',
  late: 'Tardanza',
  absent: 'Faltó',
};

const getTodayString = (): string => {
  const now = new Date();
  const peruTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
  const year = peruTime.getFullYear();
  const month = String(peruTime.getMonth() + 1).padStart(2, '0');
  const day = String(peruTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Props = {
  sessionId: string;
  canEditSession: boolean;
  onClose: () => void;
};

export const AttendanceSheetModal = ({ sessionId, canEditSession, onClose }: Props) => {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.role);
  const isCeo = role === 'ceo';

  const [edits, setEdits] = useState<Record<string, AttendanceStatus>>({});
  const [savingDraft, setSavingDraft] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [whatsappResult, setWhatsappResult] = useState<any>(null);

  const { data: sheet, isLoading, error } = useQuery({
    queryKey: ['attendance-sheet', sessionId],
    queryFn: () => attendanceApi.getSession(sessionId),
    retry: false,
  });

  const today = getTodayString();
  const sessionDate = sheet ? String(sheet.session.sessionDate).substring(0, 10) : '';
  const isToday = sessionDate === today;
  const isFinal = sheet?.session.isFinal ?? false;

  /**
   * Reglas de edición:
   *  - CEO: siempre puede editar (incluso sesiones cerradas).
   *  - Docente tutor: puede editar si la sesión NO está cerrada Y es de HOY.
   *  - Docente no tutor: solo lectura.
   */
  const canEdit = isCeo || (!isFinal && canEditSession && isToday);

  const handleChange = (studentId: string, status: AttendanceStatus) => {
    if (!canEdit) return;
    setEdits((prev) => ({ ...prev, [studentId]: status }));
  };

  const getStatusFor = (studentId: string, currentStatus: string | undefined): AttendanceStatus => {
    return edits[studentId] ?? (currentStatus as AttendanceStatus) ?? 'present';
  };

  const buildRecords = () =>
    Object.entries(edits).map(([studentId, status]) => ({ studentId, status }));

  const handleSaveDraft = async () => {
    const records = buildRecords();
    if (records.length === 0) {
      alert('No hay cambios que guardar');
      return;
    }

    setSavingDraft(true);
    try {
      const result = await attendanceApi.bulkRecords(sessionId, records, 'draft');
      alert(`✅ ${result.saved} registro(s) guardado(s) como borrador`);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleConfirmClose = async () => {
    const records = buildRecords();

    const finalRecords =
      records.length > 0
        ? records
        : (sheet?.rows ?? [])
            .filter((r) => r.record)
            .map((r) => ({
              studentId: r.student.id,
              status: r.record!.status,
            }));

    if (finalRecords.length === 0) {
      alert('Debes marcar al menos un estudiante antes de cerrar la sesión');
      return;
    }

    setSavingDraft(true);
    try {
      const result = await attendanceApi.bulkRecords(sessionId, finalRecords, 'final');
      setShowCloseConfirm(false);
      setEdits({});

      queryClient.invalidateQueries({ queryKey: ['attendance-sheet', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['attendance-sessions'] });

      if (result.notification) {
        setWhatsappResult(result.notification);
      }
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <>
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
            {canEdit && (
              <>
                <Button
                  variant="secondary"
                  onClick={handleSaveDraft}
                  loading={savingDraft}
                  icon={<Save className="w-4 h-4" />}
                >
                  Guardar temporal
                </Button>
                {!isFinal && (
                  <Button
                    onClick={() => setShowCloseConfirm(true)}
                    loading={savingDraft}
                    icon={<Lock className="w-4 h-4" />}
                  >
                    Cerrar sesión
                  </Button>
                )}
              </>
            )}
          </>
        }
      >
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error instanceof Error ? error.message : 'Error al cargar la sesión'}
          </div>
        ) : !sheet ? (
          <div className="p-8 text-center text-gray-500">Sesión no encontrada</div>
        ) : (
          <div>
            {isFinal && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                <span>
                  Esta sesión está cerrada. {isCeo
                    ? 'Como CEO, puedes editarla y guardar cambios.'
                    : 'Solo el CEO puede modificarla.'}
                </span>
              </div>
            )}

            {!isFinal && !canEdit && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 mb-4 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Solo lectura. Contacta al tutor o al CEO para modificar.</span>
              </div>
            )}

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
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {row.student.fullName}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-1">
                            {(['present', 'late', 'absent'] as AttendanceStatus[]).map((s) => (
                              <button
                                key={s}
                                onClick={() => handleChange(row.student.id, s)}
                                disabled={!canEdit}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                  status === s
                                    ? s === 'present'
                                      ? 'bg-green-600 text-white'
                                      : s === 'late'
                                        ? 'bg-yellow-500 text-white'
                                        : 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                } ${!canEdit ? 'cursor-not-allowed opacity-60' : ''}`}
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

      <CloseSessionModal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleConfirmClose}
        absentsCount={
          sheet
            ? sheet.rows.filter(
                (r) =>
                  (edits[r.student.id] ?? r.record?.status) === 'absent',
              ).length
            : 0
        }
        loading={savingDraft}
      />

      <SendWhatsAppResultModal
        open={!!whatsappResult}
        onClose={() => {
          setWhatsappResult(null);
          onClose();
        }}
        result={whatsappResult}
      />
    </>
  );
};