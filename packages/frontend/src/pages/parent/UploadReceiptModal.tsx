import { useState } from 'react';
import { UploadCloud, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { financeApi } from '@/api/finance.api';
import { getErrorMessage } from '@/api/client';

type Props = {
  open: boolean;
  onClose: () => void;
  invoiceId: string;
  onSuccess: () => void;
};

export const UploadReceiptModal = ({ open, onClose, invoiceId, onSuccess }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 5 * 1024 * 1024) {
        setError('La imagen no puede pesar más de 5 MB');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Debes seleccionar una imagen del comprobante');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await financeApi.uploadReceipt(invoiceId, file, notes || undefined);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Subir comprobante de pago"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={uploading}>
            Enviar comprobante
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Sube una foto clara de tu Yape, Plin o transferencia bancaria. El colegio lo revisará y marcará como pagado.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imagen del comprobante *</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              id="receipt-upload"
            />
            <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center">
              <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-primary-600">
                {file ? file.name : 'Haz clic para seleccionar una imagen'}
              </span>
              <span className="text-xs text-gray-500 mt-1">JPG, PNG o WebP (Máx 5MB)</span>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: Pago realizado desde el banco BCP"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
};