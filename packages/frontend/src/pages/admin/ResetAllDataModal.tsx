import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { adminApi } from '@/api/admin.api';
import { getErrorMessage } from '@/api/client';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (result: {
    deletedOrganizations: number;
    droppedSchemas: string[];
  }) => void;
};

const CONFIRMATION_PHRASE = 'BORRAR TODO';

export const ResetAllDataModal = ({ open, onClose, onSuccess }: Props) => {
  const [confirmation, setConfirmation] = useState('');
  const [understood, setUnderstood] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmation('');
      setUnderstood(false);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => adminApi.resetAllData(confirmation),
    onSuccess: (data) => {
      onSuccess({
        deletedOrganizations: data.deletedOrganizations,
        droppedSchemas: data.droppedSchemas,
      });
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const isValid =
    confirmation.trim() === CONFIRMATION_PHRASE && understood;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="⚠️ Borrar TODOS los datos"
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={!isValid}
            icon={<Trash2 className="w-4 h-4" />}
          >
            Borrar todo
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <div className="font-semibold mb-1">
                Esta acción es IRREVERSIBLE
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Se borrarán <strong>todos los colegios</strong> y sus esquemas PostgreSQL.</li>
                <li>Se borrarán <strong>todos los usuarios</strong> (CEO, docentes, estudiantes, padres).</li>
                <li>Se borrarán notas, asistencias, facturas, pagos, historiales.</li>
                <li>Se borrarán los logs de auditoría.</li>
                <li>
                  <strong>Solo quedará tu usuario super-admin</strong> (el actual).
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
          <strong>💡 Tip:</strong> si quieres conservar algún colegio, expórtalo antes
          con el botón <em>Exportar</em> en la lista de colegios.
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-700 mb-3">
            Para confirmar, escribe la frase:
            <span className="ml-2 font-mono bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
              {CONFIRMATION_PHRASE}
            </span>
          </div>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            autoFocus
          />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm text-red-800">
            <strong>Entiendo que esta acción es irreversible y no hay vuelta atrás.</strong>
          </span>
        </label>
      </div>
    </Modal>
  );
};