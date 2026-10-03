import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';
import type { Organization } from '@/types/admin';

type Props = {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSuccess: () => void;
};

export const DeleteOrganizationModal = ({ open, onClose, organization, onSuccess }: Props) => {
  const [confirmation, setConfirmation] = useState('');
  const [reason, setReason] = useState('');
  const [forceDelete, setForceDelete] = useState(false);

  const { data: dataCount } = useQuery({
    queryKey: ['admin', 'org-data-count', organization?.id],
    queryFn: () => adminApi.getOrganizationDataCount(organization!.id),
    enabled: open && !!organization,
  });

  useEffect(() => {
    if (open) {
      setConfirmation('');
      setReason('');
      setForceDelete(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!organization) throw new Error('Sin organización');
      return adminApi.deleteOrganization(organization.id, {
        confirmationName: confirmation,
        reason: reason || undefined,
        forceDelete,
      });
    },
    onSuccess: (data) => {
      onSuccess();
      alert(`✅ Colegio eliminado\n\nUsuarios borrados: ${data.deletedUsers}\nEsquema eliminado: ${data.schemaDropped}`);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  if (!organization) return null;

  const hasData = (dataCount?.total ?? 0) > 0;
  const nameMatches = confirmation.trim() === organization.name;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚠️ Eliminar colegio definitivamente"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!nameMatches || (hasData && !forceDelete)}
          >
            Eliminar definitivamente
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <div className="font-semibold mb-1">Esta acción es IRREVERSIBLE</div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Se borrará la organización <strong>{organization.name}</strong></li>
                <li>Se eliminará el esquema PostgreSQL <code>{organization.schemaName}</code></li>
                <li>Se borrarán TODOS los datos: estudiantes, notas, asistencias, pagos</li>
                <li>Se eliminarán los usuarios que solo pertenecían a este colegio</li>
              </ul>
            </div>
          </div>
        </div>

        {hasData && dataCount && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="font-semibold text-orange-800 mb-2">
              ⚠️ Este colegio tiene datos
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm text-orange-900">
              <div>Estudiantes: <strong>{dataCount.breakdown.students}</strong></div>
              <div>Docentes: <strong>{dataCount.breakdown.teachers}</strong></div>
              <div>Cursos: <strong>{dataCount.breakdown.courses}</strong></div>
              <div>Facturas: <strong>{dataCount.breakdown.invoices}</strong></div>
              <div>Pagos: <strong>{dataCount.breakdown.payments}</strong></div>
            </div>
            <div className="mt-3 text-xs text-orange-900">
              Se recomienda <strong>exportar los datos</strong> antes de eliminar.
            </div>
          </div>
        )}

        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-700 mb-3">
            Para confirmar, escribe el nombre exacto del colegio:
            <div className="mt-1 font-mono bg-gray-100 px-2 py-1 rounded text-xs inline-block">
              {organization.name}
            </div>
          </div>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="Nombre exacto del colegio"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Motivo (opcional, para auditoría)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Ej: Colegio canceló contrato el 15/10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm"
          />
        </div>

        {hasData && (
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={forceDelete}
              onChange={(e) => setForceDelete(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-red-800">
              <strong>Confirmo que quiero eliminar el colegio CON TODOS SUS DATOS</strong>
              <div className="text-xs text-red-700 mt-1">
                Entiendo que esta acción es irreversible y no hay vuelta atrás.
              </div>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
};