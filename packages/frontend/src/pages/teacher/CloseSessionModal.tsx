import { AlertTriangle, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  absentsCount: number;
  loading?: boolean;
};

export const CloseSessionModal = ({
  open,
  onClose,
  onConfirm,
  absentsCount,
  loading = false,
}: Props) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cerrar sesión de asistencia"
      size="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} loading={loading} icon={<Lock className="w-4 h-4" />}>
            Sí, cerrar y notificar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <div className="font-semibold mb-1">¿Estás seguro?</div>
            <p>
              Una vez cerrada, <strong>solo el CEO podrá reabrir esta sesión</strong>.
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <div className="font-semibold mb-1">📲 Se enviará WhatsApp automáticamente</div>
          <p>
            Se notificará a los padres de los <strong>{absentsCount} estudiante(s)</strong> marcados
            como <strong>falta</strong> en esta sesión.
          </p>
          <p className="text-xs mt-2 text-blue-700">
            Solo se enviará a padres que tengan un teléfono registrado.
          </p>
        </div>
      </div>
    </Modal>
  );
};