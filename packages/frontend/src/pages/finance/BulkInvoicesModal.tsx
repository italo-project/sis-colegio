import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { financeApi } from '@/api/finance.api';
import { sectionsApi } from '@/api/sections.api';
import { getErrorMessage } from '@/api/client';
import type { BulkInvoicesPayload } from '@/types/finance';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: number) => void;
};

export const BulkInvoicesModal = ({ open, onClose, onSuccess }: Props) => {
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedConcept, setSelectedConcept] = useState('');
  const [period, setPeriod] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const { data: sections } = useQuery({
    queryKey: ['sections-for-bulk-invoice'],
    queryFn: () => sectionsApi.list({ active: 'true' }),
    enabled: open,
  });

  const { data: concepts } = useQuery({
    queryKey: ['concepts-for-bulk'],
    queryFn: () => financeApi.listConcepts({ active: 'true' }),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setSelectedSection('');
      setSelectedConcept('');
      setPeriod('');
      setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setNotes('');
      setResult(null);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: (payload: BulkInvoicesPayload) => financeApi.bulkInvoices(payload),
    onSuccess: (data) => {
      setResult({ created: data.created, skipped: data.skipped });
      if (data.created > 0) onSuccess(data.created);
    },
    onError: (err) => alert(getErrorMessage(err)),
  });

  const handleSubmit = async () => {
    if (!selectedSection || !selectedConcept || !dueDate) {
      alert('Completa los campos requeridos');
      return;
    }

    setIsWorking(true);
    try {
      await mutation.mutateAsync({
        sectionId: selectedSection,
        feeConceptId: selectedConcept,
        period: period || undefined,
        dueDate,
        notes: notes || undefined,
      });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Facturación masiva"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isWorking}>
            Cerrar
          </Button>
          <Button onClick={handleSubmit} loading={isWorking}>
            Generar facturas
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          Genera una factura para <strong>todos los estudiantes activos</strong> de la sección
          seleccionada. Se omite a quienes ya tengan una factura del mismo concepto y período.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sección *</label>
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {sections?.map((s) => (
              <option key={s.id} value={s.id}>
                Sección "{s.name}"
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
          <select
            value={selectedConcept}
            onChange={(e) => setSelectedConcept(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Selecciona...</option>
            {concepts?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — S/ {c.defaultAmount.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Período"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder="2026-03"
            hint="Opcional"
          />
          <Input
            label="Vencimiento *"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none text-sm"
          />
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="font-medium text-gray-900 mb-1">Resultado:</div>
            <div className="text-gray-700">
              ✅ {result.created} factura(s) creada(s)
              {result.skipped > 0 && ` · ⏭️ ${result.skipped} ya existían`}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};