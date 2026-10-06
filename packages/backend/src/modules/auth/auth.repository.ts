import crypto from 'crypto';
import { prisma } from '../../config/prisma';

export const passwordResetRepository = {
  /**
   * Crea un token de recuperación. Devuelve el token en texto plano
   * (que va en el email) y guarda el hash en la DB.
   */
  async createToken(userId: string) {
    // Generar token aleatorio
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Expira en 30 minutos
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Invalidar tokens previos del usuario
    await prisma.$executeRawUnsafe(
      `UPDATE public.password_reset_tokens SET used_at = now() WHERE user_id = $1::uuid AND used_at IS NULL`,
      userId,
    );

    // Insertar nuevo token
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1::uuid, $2, $3)`,
      userId,
      tokenHash,
      expiresAt,
    );

    return { token, expiresAt };
  },

  /**
   * Busca un token válido (no usado y no expirado).
   */
  async findValidToken(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const rows = await prisma.$queryRawUnsafe<
      Array<{ id: string; user_id: string; expires_at: Date }>
    >(
      `SELECT id, user_id, expires_at FROM public.password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
       LIMIT 1`,
      tokenHash,
    );

    return rows[0] ?? null;
  },

  /**
   * Marca el token como usado.
   */
  async markAsUsed(tokenId: string) {
    await prisma.$executeRawUnsafe(
      `UPDATE public.password_reset_tokens SET used_at = now() WHERE id = $1::uuid`,
      tokenId,
    );
  },
};