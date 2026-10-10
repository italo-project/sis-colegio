import { Router } from 'express';
import { requireAuth } from '../../middleware/auth';
import { resolveTenant } from '../../middleware/tenant';
import { requireRole } from '../../middleware/rbac';
import { whatsappController } from './whatsapp.controller';

export const whatsappRouter = Router();

whatsappRouter.use(resolveTenant);
whatsappRouter.use(requireAuth);

// Solo el CEO puede reenviar manualmente (para debug)
whatsappRouter.post(
  '/sessions/:id/resend',
  requireRole('ceo'),
  whatsappController.resendSession,
);