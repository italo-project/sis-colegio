import { env } from '../../config/env';

type InvoiceForPayment = {
  id: string;
  amount: number;
  feeConcept: { name: string; code: string };
  student: { firstName: string; lastName: string; dni: string };
};

type BuildPreferenceParams = {
  invoice: InvoiceForPayment;
  payerEmail?: string;
  notificationUrl: string;
  marketplaceFeePercent: number;
};

/**
 * Construye el payload para crear una preferencia de pago en Mercado Pago.
 * Calcula el `marketplace_fee` (comisión de tu plataforma) a partir del monto.
 */
export const buildPreferencePayload = ({
  invoice,
  payerEmail,
  notificationUrl,
  marketplaceFeePercent,
}: BuildPreferenceParams) => {
  const marketplaceFee = Number(
    ((invoice.amount * marketplaceFeePercent) / 100).toFixed(2),
  );

  // URLs de retorno: el padre vuelve a estas páginas tras el pago
  const baseUrl = env.FRONTEND_URL.replace(/\/+$/, '');

  const description = `${invoice.feeConcept.name} — ${invoice.student.firstName} ${invoice.student.lastName}`;

  return {
    items: [
      {
        id: invoice.id,
        title: description,
        description: `Factura ${invoice.feeConcept.code} — DNI ${invoice.student.dni}`,
        quantity: 1,
        unit_price: invoice.amount,
        currency_id: 'PEN',
      },
    ],
    external_reference: invoice.id,
    notification_url: notificationUrl,
    back_urls: {
      success: `${baseUrl}/pago/exito?invoice=${invoice.id}`,
      failure: `${baseUrl}/pago/fallo?invoice=${invoice.id}`,
      pending: `${baseUrl}/pago/pendiente?invoice=${invoice.id}`,
    },
    auto_return: 'approved' as const,
    marketplace_fee: marketplaceFee,
    payer: payerEmail ? { email: payerEmail } : undefined,
    statement_descriptor: 'SISTEMA COLEGIOS',
  };
};