import { prisma } from '../../config/prisma';
import { encrypt, decrypt } from '../../utils/encryption';

type OrganizationMPRow = {
  id: string;
  mp_user_id: string | null;
  mp_access_token: string | null;
  mp_refresh_token: string | null;
  mp_public_key: string | null;
  mp_connected_at: Date | null;
  mp_expires_at: Date | null;
};

export const mpRepository = {
  async saveTokens(
    organizationId: string,
    data: {
      mpUserId: string;
      accessToken: string;
      refreshToken: string;
      publicKey: string;
      expiresIn: number;
    },
  ) {
    const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mpUserId: data.mpUserId,
        mpAccessToken: encrypt(data.accessToken),
        mpRefreshToken: encrypt(data.refreshToken),
        mpPublicKey: data.publicKey,
        mpConnectedAt: new Date(),
        mpExpiresAt: expiresAt,
      },
    });
  },

  async getConnection(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        mpUserId: true,
        mpAccessToken: true,
        mpRefreshToken: true,
        mpPublicKey: true,
        mpConnectedAt: true,
        mpExpiresAt: true,
      },
    });

    if (!org) return null;

    if (!org.mpAccessToken || !org.mpRefreshToken) {
      return {
        connected: false as const,
        publicKey: org.mpPublicKey,
        connectedAt: org.mpConnectedAt,
        expiresAt: org.mpExpiresAt,
      };
    }

    return {
      connected: true as const,
      mpUserId: org.mpUserId,
      accessToken: decrypt(org.mpAccessToken),
      refreshToken: decrypt(org.mpRefreshToken),
      publicKey: org.mpPublicKey,
      connectedAt: org.mpConnectedAt,
      expiresAt: org.mpExpiresAt,
    };
  },

  async disconnect(organizationId: string) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        mpUserId: null,
        mpAccessToken: null,
        mpRefreshToken: null,
        mpPublicKey: null,
        mpConnectedAt: null,
        mpExpiresAt: null,
      },
    });
  },
};