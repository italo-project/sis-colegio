import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma';
import { hashPassword, verifyPassword } from '../../utils/password';
import { signAccessToken, createRefreshToken, rotateRefreshToken } from '../../utils/jwt';
import { provisionTenantSchema } from '../../utils/tenant-schema';
import { env } from '../../config/env';
import { forgotPasswordSchema, resetPasswordSchema } from './auth.schemas';
import { passwordResetRepository } from './auth.repository';
import { sendPasswordResetEmail } from '../../services/email.service';


// ═══════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(3),
  organization: z
    .object({
      name: z.string().min(3),
      subdomain: z.string().regex(/^[a-z][a-z0-9-]{2,30}$/),
      schemaName: z.string().regex(/^[a-z][a-z0-9_]{2,62}$/),
    })
    .optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const superAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ═══════════════════════════════════════════════════════════════
// CONTROLLERS
// ═══════════════════════════════════════════════════════════════

export const register = async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }
  const { email, password, fullName, organization } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'El correo ya está registrado' });

  const passwordHash = await hashPassword(password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, passwordHash, fullName },
    });

    if (!organization) return { user, org: null, role: null };

    const org = await tx.organization.create({
      data: {
        name: organization.name,
        subdomain: organization.subdomain,
        schemaName: organization.schemaName,
      },
    });

    await tx.organizationUser.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: 'ceo',
      },
    });

    return { user, org, role: 'ceo' };
  });

  // El esquema del tenant se crea fuera de la transacción de Prisma
  if (result.org) {
    await provisionTenantSchema(result.org.schemaName);
  }

  return res.status(201).json({
    user: { id: result.user.id, email: result.user.email, fullName: result.user.fullName },
    organization: result.org && {
      id: result.org.id,
      name: result.org.name,
      subdomain: result.org.subdomain,
    },
    role: result.role,
  });
};

export const login = async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });
  const { email, password } = parsed.data;

  if (!req.tenant) return res.status(400).json({ error: 'Colegio no resuelto' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const membership = await prisma.organizationUser.findFirst({
    where: {
      userId: user.id,
      organizationId: req.tenant.id,
      isActive: true,
    },
  });
  if (!membership) {
    return res.status(403).json({ error: 'El usuario no pertenece a este colegio' });
  }

  const accessToken = signAccessToken({
    userId: user.id,
  organizationId: req.tenant.id,
  role: membership.role,
  schemaName: req.tenant.schemaName,
  isSuperAdmin: user.isSuperAdmin,
  email: user.email,
  });
  const refreshToken = await createRefreshToken(user.id, req.tenant.id);

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isSuperAdmin: user.isSuperAdmin,
    },
    role: membership.role,
    tenant: { id: req.tenant.id, subdomain: req.tenant.subdomain },
  });
};

export const refresh = async (req: Request, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Refresh token requerido' });

  try {
    const decoded = await rotateRefreshToken(parsed.data.refreshToken);

    if (!req.tenant || req.tenant.id !== decoded.organizationId) {
      return res.status(403).json({ error: 'El token no corresponde a este colegio' });
    }

    const membership = await prisma.organizationUser.findFirst({
      where: { userId: decoded.userId, organizationId: decoded.organizationId, isActive: true },
    });
    if (!membership) return res.status(403).json({ error: 'Membresía inactiva' });

    const accessToken = signAccessToken({
      userId: decoded.userId,
      organizationId: decoded.organizationId,
      role: membership.role,
      schemaName: req.tenant.schemaName,
    });
    const refreshToken = await createRefreshToken(decoded.userId, decoded.organizationId);

    return res.json({ accessToken, refreshToken });
  } catch {
    return res.status(401).json({ error: 'Refresh token inválido' });
  }
};

/**
 * Login del super-administrador (dueño del SaaS).
 * NO requiere subdominio. Se autentica solo con email + password.
 */
export const superAdminLogin = async (req: Request, res: Response) => {
  const parsed = superAdminLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Datos inválidos' });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive || !user.isSuperAdmin) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  const accessToken = signAccessToken({
    userId: user.id,
  organizationId: '00000000-0000-0000-0000-000000000000',
  role: 'admin',
  schemaName: 'public',
  isSuperAdmin: true,
  email: user.email,
  });
  const refreshToken = await createRefreshToken(user.id, '00000000-0000-0000-0000-000000000000');

  return res.json({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isSuperAdmin: true,
    },
    role: 'admin',
    tenant: { id: '', subdomain: 'admin' },
  });
};

// ═══ Recuperación de contraseña ═══

export const forgotPassword = async (req: Request, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const { email } = parsed.data;

  // Buscar usuario
  const user = await prisma.user.findUnique({ where: { email } });

  // IMPORTANTE: siempre responder OK, incluso si el email no existe
  // (para no revelar qué emails están registrados) [citation:1][citation:11]
  if (!user || !user.isActive) {
    return res.json({
      ok: true,
      message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña.',
    });
  }

  try {
    const { token } = await passwordResetRepository.createToken(user.id);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl,
    });

    return res.json({
      ok: true,
      message: 'Si el email existe, recibirás un enlace para recuperar tu contraseña.',
    });
  } catch (err) {
    console.error('❌ Error enviando email de recuperación:', err);
    return res.status(500).json({
      error: 'No se pudo enviar el email. Intenta más tarde.',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', details: parsed.error.flatten() });
  }

  const { token, newPassword } = parsed.data;

  const validToken = await passwordResetRepository.findValidToken(token);
  if (!validToken) {
    return res.status(400).json({
      error: 'El enlace es inválido o ha expirado. Solicita uno nuevo.',
    });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: validToken.user_id },
    data: { passwordHash },
  });

  await passwordResetRepository.markAsUsed(validToken.id);

  return res.json({
    ok: true,
    message: 'Contraseña actualizada. Ya puedes iniciar sesión.',
  });
};