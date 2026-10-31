import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
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

export const EditOrganizationModal = ({ open, onClose, organization, onSuccess }: Props) => {
  const [name, setName] = useState('');
  const [plan, setPlan] = useState<'basic' | 'pro' | 'business' | 'enterprise'>('basic');
  const [paymentGatewayEnabled, setPaymentGatewayEnabled] = useState(false);
  const [paymentManualEnabled, setPaymentManualEnabled] = useState(true);

  useEffect(() => {
    if (open && organization) {
      setName(organization.name);
      setPlan(organization.plan);
      setPaymentGatewayEnabled(organization.paymentGatewayEnabled ?? false);
      setPaymentManualEnabled(organization.paymentManualEnabled ?? true);
    }
  }, [open, organization]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!organization) throw new Error('Sin organización');
      return adminApi.updateOrganization(organization.id, {
        name,
        plan,
        paymentGatewayEnabled,
        paymentManualEnabled,
      });
    },
    onSuccess,
    onError: (err) => alert(getErrorMessage(err)),
  });

  if (!organization) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar ${organization.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nombre del colegio"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
          <select
            value={plan}
            onChange={(e) =>
              setPlan(e.target.value as 'basic' | 'pro' | 'business' | 'enterprise')
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 outline-none"
          >
            <option value="basic">Básico</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Métodos de pago</h4>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentGatewayEnabled}
                onChange={(e) => setPaymentGatewayEnabled(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Pasarela de pago (Izipay)
                </div>
                <div className="text-xs text-gray-500">
                  El padre paga con tarjeta y el pago se aprueba automáticamente.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={paymentManualEnabled}
                onChange={(e) => setPaymentManualEnabled(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Transferencia / Yape (validación manual)
                </div>
                <div className="text-xs text-gray-500">
                  El padre sube un comprobante y el CEO valida el pago manualmente.
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
          <div>
            <strong>Subdominio:</strong> {organization.subdomain}
          </div>
          <div className="mt-1">(No se puede cambiar desde la UI)</div>
        </div>
      </div>
    </Modal>
  );
};