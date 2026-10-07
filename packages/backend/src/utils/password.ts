import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/**
 * Genera una contraseña aleatoria de 12 caracteres alfanuméricos + 1 símbolo.
 * Ejemplo: Xk9pQ2mNv3!r
 */
export const generateRandomPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(crypto.randomInt(0, chars.length));
  }
  const symbol = symbols.charAt(crypto.randomInt(0, symbols.length));
  return password + symbol;
};