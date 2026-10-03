import { Request, Response } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { validateWebhookSignature } from './mp-webhook.helpers';
import { getPayment } from './mp.client';
import { mpRepository } from './mp.repository';
import { paymentsRepository, invoicesRepository } from '../finance/finance.repository';

/**
 * Formato del webhook de Mercado Pago:
 * {
 *   "id": 12345,
 *   "live_mode": false,
 *   "type": "payment",
 *   "date_created": "2026-10-03T...",
 *   "action": "payment.created",
 *   "data": { "id": "12345678" }
 * }
 *
 * También puede venir con `type: "payment"` y query params `?type=payment&data.id=...`
 */
type MPWebhookBody = {
  id?: number;
  live_mode?: boolean;
  type?: string;
  action?: string;
  data?: { id?: string | number };
};

export const mpWebhookController = {
  /**
   * POST /api/mercadopago/webhook
   * Recibe notificaciones de Mercado Pago.
   *
   * IMPORTANTE: este endpoint NO requiere auth. La validación se hace
   * por firma HMAC + consulta del pago real a la API de MP.
   */
  async handle(req: Request, res: Response) {
    const body = req.body as MPWebhookBody;

    // Extraer `data.id` (puede venir en body o en query)
    const dataId = String(
      body.data?.id ?? req.query['data.id'] ?? req.query.id ?? '',
    );

    // Extraer `type` (puede venir en body o en query)
    const type = String(body.type ?? req.query.type ?? '');

    // Log para debugging (útil cuando estás configurando)
    console.log(`📨 Webhook MP recibido: type=${type} dataId=${dataId}`);

    // Ignorar tipos que no nos interesan
    if (type !== 'payment') {
      console.log(`   ⏭️  Ignorado (type no es 'payment')`);
      return res.status(200).json({ received: true, ignored: true });
    }

    if (!dataId) {
      console.log(`   ❌ Falta data.id`);
      return res.status(400).json({ error: 'Falta data.id' });
    }

    // 1. Validar firma
    const signature = validateWebhookSignature({
      xSignature: req.header('x-signature'),
      xRequestId: req.header('x-request-id'),
      dataId,
    });

    if (!signature.valid) {
      console.warn(`   🔒 Firma inválida: ${signature.reason}`);
      return res.status(401).json({ error: 'Firma inválida' });
    }

    console.log(`   ✅ Firma válida`);

    // 2. Encontrar el pago en nuestra BD por el gateway_tx_id
    //    Nota: en el webhook, data.id es el ID del pago en MP.
    //    Nosotros guardamos en `gateway_tx_id` el preference_id, no el payment_id.
    //    Entonces, para encontrar el pago, necesitamos buscar por MP.
    //    Pero primero: ¿existe alguna preferencia con este ID? No, porque
    //    el webhook nos da el payment_id, no el preference_id.
    //    Solución: buscamos el pago en MP, leemos su external_reference,
    //    y con eso encontramos la factura en nuestra BD.

    // 3. Buscar la conexión MP activa de algún colegio
    //    Como no sabemos qué colegio es, iteramos por organizaciones conectadas.
    //    Esto NO es óptimo pero es correcto: MP no nos dice qué colegio es.
    //    Alternativa: en el payload incluir `external_reference` con la org.
    //    En una siguiente fase, optimizamos esto.

    const organizations = await prisma.organization.findMany({
      where: {
        mpAccessToken: { not: null },
        isActive: true,
      },
      select: { id: true, subdomain: true, schemaName: true },
    });

    let foundPayment = null;
    let foundOrg = null;

    for (const org of organizations) {
      const connection = await mpRepository.getConnection(org.id);
      if (!connection || !connection.connected) continue;

      try {
        const mpPayment = await getPayment(connection.accessToken, dataId);

        // Verificar si el external_reference coincide con alguna factura de este colegio
        if (!mpPayment.external_reference) continue;

        const invoice = await invoicesRepository.findById(
          org.schemaName,
          mpPayment.external_reference,
        );
        if (!invoice) continue;

        // Encontramos la factura. Ahora actualizamos el pago en nuestra BD.
        foundOrg = org;

        // Buscar el pago pendiente en nuestra BD por gateway_tx_id = preference_id
        // No tenemos el preference_id aquí, así que buscamos el último pago pendiente
        // de esta factura
        const payments = await prisma.$queryRawUnsafe<
          Array<{ id: string; status: string }>
        >(
          `SELECT id, status FROM "${org.schemaName}".payments
           WHERE invoice_id = $1::uuid AND gateway = 'mercadopago'
           ORDER BY created_at DESC LIMIT 1`,
          invoice.id,
        );

        if (payments[0]) {
          foundPayment = payments[0];
        }

        // Actualizar el pago con el estado real de MP
        if (foundPayment) {
          const newStatus = mapMPStatusToLocal(mpPayment.status);

          await paymentsRepository.updateStatus(
            org.schemaName,
            foundPayment.id,
            newStatus,
            dataId,
          );

          console.log(
            `   💳 Pago actualizado: ${foundPayment.id} → ${newStatus}`,
          );

          // Si fue aprobado, marcar la factura como pagada
          if (newStatus === 'approved') {
            await invoicesRepository.markPaid(org.schemaName, invoice.id);
            console.log(`   ✅ Factura marcada como pagada: ${invoice.id}`);
          }
        }

        break; // Ya encontramos el colegio, salimos del loop
      } catch (err) {
        // Si el pago no existe en este colegio, MP lanzará 404. Continuamos.
        continue;
      }
    }

    if (!foundPayment) {
      console.warn(`   ⚠️  No se encontró el pago en ningún colegio`);
    }

    // Siempre responder 200 a MP para que no reintente
    return res.status(200).json({ received: true });
  },
};

/**
 * Mapea los estados de pago de MP a los nuestros.
 */
const mapMPStatusToLocal = (mpStatus: string): string => {
  switch (mpStatus) {
    case 'approved':
      return 'approved';
    case 'rejected':
    case 'cancelled':
      return 'rejected';
    case 'refunded':
    case 'charged_back':
      return 'refunded';
    case 'pending':
    case 'in_process':
    case 'authorized':
    default:
      return 'pending';
  }
};