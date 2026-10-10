import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  PORT: z.coerce.number().default(3000),
  BASE_DOMAIN: z.string().default('localhost'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Mercado Pago
  MP_CLIENT_ID: z.string().min(5),
  MP_CLIENT_SECRET: z.string().min(10),
  MP_ACCESS_TOKEN_TEST: z.string().min(10),
  MP_PUBLIC_KEY_TEST: z.string().min(10),
  MP_WEBHOOK_SECRET: z.string().default(''),
  MP_REDIRECT_URI: z.string().url(),
  MP_SANDBOX: z.coerce.boolean().default(true),
  MP_MARKETPLACE_FEE_PERCENT: z.coerce.number().min(0).max(50).default(0),

  // Frontend (para URLs de retorno de pago)
  FRONTEND_URL: z.string().url().default('http://localhost:3001'),

  // Cifrado
  ENCRYPTION_KEY: z.string().min(16),

  // Email
  RESEND_API_KEY: z.string().min(10),
  RESEND_FROM_EMAIL: z.string().min(5),

  // WhatsApp (Meta Cloud API) — Fase D
  WHATSAPP_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_SIMULATED: z.coerce.boolean().default(true),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;