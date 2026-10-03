import crypto from 'crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recomendado para GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Deriva una clave de 32 bytes a partir de ENCRYPTION_KEY.
 * Si el valor no es base64 válido, usa sha256 del string.
 */
const getKey = (): Buffer => {
  try {
    const buf = Buffer.from(env.ENCRYPTION_KEY, 'base64');
    if (buf.length === 32) return buf;
  } catch {
    // ignorar y usar fallback
  }
  return crypto.createHash('sha256').update(env.ENCRYPTION_KEY).digest();
};

/**
 * Cifra un texto plano. Devuelve un string base64 con formato:
 *   iv:authTag:ciphertext  (cada uno en base64)
 */
export const encrypt = (plain: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
};

/**
 * Descifra un texto cifrado por `encrypt()`.
 * Devuelve el string original.
 */
export const decrypt = (payload: string): string => {
  const parts = payload.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de cifrado inválido');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const ciphertext = Buffer.from(parts[2], 'base64');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('IV o authTag con longitud incorrecta');
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
};