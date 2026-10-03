import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../../config/prisma';
import { redis } from '../../config/redis';
import { env } from '../../config/env';
import {
  buildAuthorizationUrl,
  exchangeOAuthCode,
  getMPUser,
} from './mp.client';
import { mpRepository } from './mp.repository';

export const mpOAuthController = {
  /**
   * GET /api/mercadopago/connect
   * Genera el state (CSRF token), lo guarda en Redis y redirige a MP.
   * Debe ser llamado por el CEO autenticado.
   */
  async connect(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'ceo') {
      return res.status(403).json({ error: 'Solo el CEO puede conectar Mercado Pago' });
    }

    const state = crypto.randomBytes(24).toString('hex');

    // Guardar state en Redis por 10 minutos con la info de quién inició
    await redis.set(
      `mp:oauth:state:${state}`,
      JSON.stringify({
        userId: user.userId,
        organizationId: user.organizationId,
      }),
      'EX',
      600,
    );

    const url = buildAuthorizationUrl(state);

    // Si viene con ?redirect=1, devuelve la URL como JSON (para el frontend)
    // Si no, redirige directamente (útil para pruebas con navegador)
    if (req.query.redirect === '1') {
      return res.json({ authorizationUrl: url });
    }

    return res.redirect(url);
  },

  /**
   * GET /api/mercadopago/callback?code=...&state=...
   * MP redirige aquí tras la autorización del colegio.
   */
  async callback(req: Request, res: Response) {
    const code = typeof req.query.code === 'string' ? req.query.code : null;
    const state = typeof req.query.state === 'string' ? req.query.state : null;

    if (!code || !state) {
      return res.status(400).json({ error: 'Faltan parámetros code o state' });
    }

    // Recuperar y borrar el state
    const stateKey = `mp:oauth:state:${state}`;
    const stateData = await redis.get(stateKey);
    if (!stateData) {
      return res.status(400).json({ error: 'State inválido o expirado (posible CSRF)' });
    }
    await redis.del(stateKey);

    const { organizationId } = JSON.parse(stateData) as {
      userId: string;
      organizationId: string;
    };

    try {
      const tokenResponse = await exchangeOAuthCode(code);

      // Obtener datos del usuario de MP para mostrar en el panel
      const mpUser = await getMPUser(tokenResponse.access_token);

      await mpRepository.saveTokens(organizationId, {
        mpUserId: String(mpUser.id),
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        publicKey: tokenResponse.public_key,
        expiresIn: tokenResponse.expires_in,
      });

      // Redirigir al panel del CEO con mensaje de éxito
      // En desarrollo puedes devolver JSON para verlo en consola
      if (env.NODE_ENV === 'development') {
        return res.json({
          ok: true,
          message: 'Mercado Pago conectado exitosamente',
          mpUser: {
            id: mpUser.id,
            nickname: mpUser.nickname,
            email: mpUser.email,
          },
        });
      }

      return res.redirect(`http://${req.hostname}:3001/ceo/settings?mp=connected`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      console.error('❌ Error en callback MP:', msg);
      return res.status(500).json({
        error: 'No se pudo conectar Mercado Pago',
        details: env.NODE_ENV === 'development' ? msg : undefined,
      });
    }
  },

  /**
   * GET /api/mercadopago/status
   * Devuelve si el colegio está conectado a Mercado Pago.
   */
  async status(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'ceo') {
      return res.status(403).json({ error: 'Solo el CEO puede ver este estado' });
    }

    const connection = await mpRepository.getConnection(user.organizationId);

    if (!connection) {
      return res.status(404).json({ error: 'Organización no encontrada' });
    }

    if (!connection.connected) {
      return res.json({
        connected: false,
        mpPublicKey: connection.publicKey,
        connectedAt: connection.connectedAt,
      });
    }

    // No exponemos los tokens, solo el estado
    return res.json({
      connected: true,
      mpUserId: connection.mpUserId,
      mpPublicKey: connection.publicKey,
      connectedAt: connection.connectedAt,
      expiresAt: connection.expiresAt,
    });
  },

  /**
   * POST /api/mercadopago/disconnect
   */
  async disconnect(req: Request, res: Response) {
    const user = req.user!;
    if (user.role !== 'ceo') {
      return res.status(403).json({ error: 'Solo el CEO puede desconectar Mercado Pago' });
    }

    await mpRepository.disconnect(user.organizationId);
    res.json({ ok: true, message: 'Mercado Pago desconectado' });
  },
};