import { env } from '../../config/env';

const MP_BASE_URL = 'https://graph.facebook.com/v21.0';

export type SendTextMessageParams = {
  to: string; // E.164 sin '+' ej: 51987111222
  body: string;
};

export type SendTextMessageResult = {
  ok: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
};

/**
 * Normaliza un número de teléfono peruano al formato E.164 sin '+'.
 * Acepta: "+51 987 111 222", "987111222", "51987111222", "51 987111222"
 * Devuelve: "51987111222" o null si no es válido.
 */
export const normalizePhone = (raw: string | null | undefined): string | null => {
  if (!raw) return null;

  // Limpiar todo lo que no sea dígito
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Si ya empieza con 51 y tiene 11 dígitos → ya está listo
  if (digits.startsWith('51') && digits.length === 11) {
    return digits;
  }

  // Si tiene 9 dígitos (celular peruano) → agregar 51
  if (digits.length === 9) {
    return `51${digits}`;
  }

  // Si tiene más de 11 y empieza con 51, cortar a 11
  if (digits.startsWith('51') && digits.length > 11) {
    return digits.substring(0, 11);
  }

  // Fallback: devolver los dígitos tal cual
  return digits;
};

/**
 * Envía un mensaje de texto por WhatsApp usando Meta Cloud API.
 * Si WHATSAPP_SIMULATED=true, solo imprime en consola y devuelve ok=true.
 */
export const sendTextMessage = async (
  params: SendTextMessageParams,
): Promise<SendTextMessageResult> => {
  const { to, body } = params;

  // Modo simulado: no llama a Meta, solo loguea
  if (env.WHATSAPP_SIMULATED) {
    console.log('\n📱 [WHATSAPP SIMULADO]');
    console.log(`   Para: +${to}`);
    console.log(`   Mensaje:\n${body.split('\n').map((l) => `      ${l}`).join('\n')}`);
    console.log('');
    return { ok: true, simulated: true };
  }

  // Validar credenciales
  if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    const msg = 'Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID en el .env';
    console.error(`❌ ${msg}`);
    return { ok: false, simulated: false, error: msg };
  }

  // Llamada real a Meta Cloud API
  try {
    const url = `${MP_BASE_URL}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };

    if (!response.ok) {
      const errorMsg = data.error?.message ?? `HTTP ${response.status}`;
      console.error(`❌ WhatsApp API error: ${errorMsg}`);
      return { ok: false, simulated: false, error: errorMsg };
    }

    const messageId = data.messages?.[0]?.id;
    console.log(`✅ WhatsApp enviado a +${to} (id: ${messageId})`);
    return { ok: true, simulated: false, messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`❌ Error enviando WhatsApp: ${msg}`);
    return { ok: false, simulated: false, error: msg };
  }
};