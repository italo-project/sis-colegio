import { Router } from 'express';
import { register, login, refresh, superAdminLogin } from './auth.controller';
import { resolveTenant } from '../../middleware/tenant';

export const authRouter = Router();

// Registro global (crea usuario y opcionalmente un colegio)
authRouter.post('/register', register);

// Login y refresh requieren saber a qué colegio se accede (subdominio)
authRouter.post('/login', resolveTenant, login);
authRouter.post('/refresh', resolveTenant, refresh);

// Login del super-admin (sin subdominio)
authRouter.post('/super-admin/login', superAdminLogin);