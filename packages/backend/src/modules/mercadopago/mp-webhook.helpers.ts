import crypto from 'crypto';
import { env } from '../../config/env';

/**
 * Valida la firma HMAC-SHA256 que envía Mercado Pago en el header `x-signature`.
 *
 * Formato del header:
 *   ts=1704908010,v1=618c85345248dd820d5fd456117c2ab2eb8a8ef8
 *
 * Formato del header `x-request-id`:
 *   1234567890-abc123def
 *
 * El string a firmar es:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 *
 * MP firma ese string con el Webhook Secret usando HMAC-SHA256.
 * Comparamos el resultado con el `v1` del header.
 */
export const validateWebhookSignature = ({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string;
}): { valid: boolean; reason?: string } => {
  // Si no hay secret configurado, no podemos validar
  if (!env.MP_WEBHOOK_SECRET) {
    return { valid: false, reason: 'MP_WEBHOOK_SECRET no configurado' };
  }

  if (!xSignature) {
    return { valid: false, reason: 'Falta header x-signature' };
  }
  if (!xRequestId) {
    return { valid: false, reason: 'Falta header x-request-id' };
  }
  if (!dataId) {
    return { valid: false, reason: 'Falta data.id' };
  }

  // Parsear x-signature: "ts=...,v1=..."
  const parts = xSignature.split(',');
  let ts: string | undefined;
  let v1: string | undefined;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') ts = value;
    if (key === 'v1') v1 = value;
  }

  if (!ts || !v1) {
    return { valid: false, reason: 'Formato de x-signature inválido' };
  }

  // Construir el string a firmar (formato oficial de MP)
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

  // Calcular HMAC-SHA256
  const hmac = crypto.createHmac('sha256', env.MP_WEBHOOK_SECRET);
  hmac.update(manifest);
  const computed = hmac.digest('hex');

  // Comparación en tiempo constante para evitar timing attacks
  const a = Buffer.from(computed, 'hex');
  const b = Buffer.from(v1, 'hex');
  if (a.length !== b.length) {
    return { valid: false, reason: 'Firma no coincide' };
  }
  const valid = crypto.timingSafeEqual(a, b);

  return { valid, reason: valid ? undefined : 'Firma no coincide' };
};