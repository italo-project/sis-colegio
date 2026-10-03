import { Router } from 'express';
import { resolveTenant } from '../../middleware/tenant';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { mpOAuthController } from './mp-oauth.controller';
import { mpWebhookController } from './mp-webhook.controller';

export const mpRouter = Router();

// Webhook: NO requiere auth ni tenant. MP lo llama directamente.
mpRouter.post('/webhook', mpWebhookController.handle);

// Callback OAuth: NO requiere auth (MP llama directamente)
mpRouter.get('/callback', mpOAuthController.callback);

// Connect/status/disconnect: requieren auth de CEO
mpRouter.get('/connect', resolveTenant, requireAuth, requireRole('ceo'), mpOAuthController.connect);
mpRouter.get('/status', resolveTenant, requireAuth, requireRole('ceo'), mpOAuthController.status);
mpRouter.post('/disconnect', resolveTenant, requireAuth, requireRole('ceo'), mpOAuthController.disconnect);