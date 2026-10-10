import { Request, Response } from 'express';
import { getStringParam } from '../../utils/params';
import { notifyAbsencesForSession } from './whatsapp.service';

/**
 * Endpoint manual para reenviar notificaciones de una sesión.
 * Útil para debugging o reenvíos.
 */
export const whatsappController = {
  async resendSession(req: Request, res: Response) {
    const sessionId = getStringParam(req, res, 'id');
    if (!sessionId) return;

    try {
      const result = await notifyAbsencesForSession(
        req.tenant!.schemaName,
        sessionId,
      );
      res.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      res.status(500).json({ error: msg });
    }
  },
};