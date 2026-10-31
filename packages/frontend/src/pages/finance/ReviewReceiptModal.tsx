import { useState } from 'react';
import { CheckCircle, XCircle, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { financeApi } from '@/api/finance.api';
import { getErrorMessage } from '@/api/client';
import type { PaymentReceipt } from '@/types/finance';

type Props = {
  open: boolean;
  onClose: () => void;
  receipt: PaymentReceipt | null;
  onSuccess: () => void;
};

export const ReviewReceiptModal = ({ open, onClose, receipt, onSuccess }: Props) => {
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!receipt) return;
    setLoading(true);
    try {
      await financeApi.reviewReceipt(receipt.id, status, reviewNotes || undefined);
      onSuccess();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!receipt) return null;

  const fullImageUrl = receipt.fileUrl.startsWith('http') 
    ? receipt.fileUrl 
    : `${import.meta.env.VITE_API_URL}${receipt.fileUrl}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Revisar comprobante de pago"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
          <Button
            variant="danger"
            onClick={() => handleReview('rejected')}
            loading={loading}
            icon={<XCircle className="w-4 h-4" />}
          >
            Rechazar
          </Button>
          <Button
            onClick={() => handleReview('approved')}
            loading={loading}
            icon={<CheckCircle className="w-4 h-4" />}
          >
            Aprobar y marcar pagado
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-gray-100 rounded-lg border border-gray-200 p-2 flex items-center justify-center min-h-[300px]">
          {fullImageUrl ? (
            <img src={fullImageUrl} alt="Comprobante" className="max-w-full max-h-[500px] object-contain" />
          ) : (
            <div className="text-center text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2" />
              No hay imagen
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <div className="text-xs text-gray-500">Comentarios del padre:</div>
          <div className="text-gray-900">{receipt.notes || 'Sin comentarios'}</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notas de revisión (opcional)
          </label>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={2}
            placeholder="Ej: El monto no coincide / Falta el número de operación"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
        </div>
      </div>
    </Modal>
  );
};