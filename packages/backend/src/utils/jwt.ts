import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { redis } from '../config/redis';

export type AccessPayload = {
  userId: string;
  organizationId: string;
  role: string;
  schemaName: string;
  isSuperAdmin?: boolean;
  email?: string;
};

export const signAccessToken = (payload: AccessPayload) =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  } as SignOptions);

export const verifyAccessToken = (token: string): AccessPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;

export const createRefreshToken = async (userId: string, organizationId: string) => {
  const tokenId = crypto.randomUUID();
  const key = `refresh:${tokenId}`;
  await redis.set(key, JSON.stringify({ userId, organizationId }), 'EX', 60 * 60 * 24 * 7);
  return jwt.sign({ userId, organizationId, tokenId }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  } as SignOptions);
};

export const rotateRefreshToken = async (refreshToken: string) => {
  const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
    userId: string;
    organizationId: string;
    tokenId: string;
  };
  const key = `refresh:${decoded.tokenId}`;
  const stored = await redis.get(key);
  if (!stored) throw new Error('Refresh token revocado o expirado');
  await redis.del(key);
  return decoded;
};