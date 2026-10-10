import { CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

type Props = {
  open: boolean;
  onClose: () => void;
  result: any;
};

export const SendWhatsAppResultModal = ({ open, onClose, result }: Props) => {
  if (!result) return null;

  // Puede venir { error: '...' } si falló todo el envío
  if ('error' in result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Error al enviar WhatsApp"
        footer={<Button onClick={onClose}>Cerrar</Button>}
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <div className="font-semibold mb-1">No se pudo enviar la notificación</div>
            <p>{result.error}</p>
            <p className="text-xs mt-2 text-red-700">
              La sesión quedó cerrada igualmente. Puedes reenviar la notificación desde el detalle
              de la sesión.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  const { totalSent, totalSkipped, totalFailed, totalStudents } = result;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sesión cerrada"
      footer={<Button onClick={onClose}>Entendido</Button>}
    >
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-900">
            <div className="font-semibold mb-1">Sesión cerrada correctamente</div>
            <p>Se procesó el envío de notificaciones por WhatsApp.</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600 border-b flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Resumen de envíos
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            <div className="p-4">
              <div className="text-xs text-gray-500">Estudiantes con falta</div>
              <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
            </div>
            <div className="p-4">
              <div className="text-xs text-gray-500">Mensajes enviados</div>
              <div className="text-2xl font-bold text-green-600">{totalSent}</div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">Omitidos (sin teléfono)</div>
              <div className="text-2xl font-bold text-yellow-600">{totalSkipped}</div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">Fallidos</div>
              <div className="text-2xl font-bold text-red-600">{totalFailed}</div>
            </div>
          </div>
        </div>

        {totalSkipped > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
            <strong>Nota:</strong> Algunos estudiantes no tienen padres con teléfono registrado.
            Se recomienda actualizar los datos de contacto.
          </div>
        )}
      </div>
    </Modal>
  );
};