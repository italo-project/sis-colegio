import { prisma } from '../../config/prisma';
import { hashPassword } from '../../utils/password';
import { provisionTenantSchema } from '../../utils/tenant-schema';
import { seedAcademicBaseData } from '../../utils/tenant-schema';
import { migrateTenantSchema } from '../../db/tenant-migrations-service';
import type { CreateOrganizationInput } from './admin.schemas';

export const adminService = {
  /**
   * Crea un colegio completo: organización + esquema + migraciones + seed académico + CEO.
   */
  async createOrganization(input: CreateOrganizationInput) {
    // 1. Verificar que no exista subdominio o schema
    const existing = await prisma.organization.findFirst({
      where: {
        OR: [{ subdomain: input.subdomain }, { schemaName: input.schemaName }],
      },
    });
    if (existing) {
      throw new Error(
        `Ya existe un colegio con ese subdominio o schema: ${existing.name}`,
      );
    }

    // 2. Verificar que el email del CEO no esté ya en uso por otro usuario
    const existingUser = await prisma.user.findUnique({ where: { email: input.ceoEmail } });
    if (existingUser) {
      throw new Error(`El email ${input.ceoEmail} ya está registrado en el sistema`);
    }

    // 3. Crear organización + usuario CEO en una transacción
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          subdomain: input.subdomain,
          schemaName: input.schemaName,
          plan: input.plan,
        },
      });

      const passwordHash = await hashPassword(input.ceoPassword);
      const ceoUser = await tx.user.create({
        data: {
          email: input.ceoEmail,
          passwordHash,
          fullName: input.ceoFullName,
        },
      });

      await tx.organizationUser.create({
        data: {
          organizationId: org.id,
          userId: ceoUser.id,
          role: 'ceo',
        },
      });

      return { org, ceoUser };
    });

    // 4. Crear el esquema del tenant y aplicar migraciones (fuera de la transacción)
    try {
      await provisionTenantSchema(input.schemaName);
      await migrateTenantSchema(input.schemaName);
      await seedAcademicBaseData(input.schemaName);
    } catch (err) {
      // Si falla, limpiamos lo creado para no dejar basura
      await prisma.organizationUser.deleteMany({
        where: { organizationId: result.org.id },
      });
      await prisma.organization.delete({ where: { id: result.org.id } });
      await prisma.user.delete({ where: { id: result.ceoUser.id } });
      throw err;
    }

    return {
      organization: {
        id: result.org.id,
        name: result.org.name,
        subdomain: result.org.subdomain,
        schemaName: result.org.schemaName,
        plan: result.org.plan,
        isActive: result.org.isActive,
      },
      ceo: {
        id: result.ceoUser.id,
        email: result.ceoUser.email,
        fullName: result.ceoUser.fullName,
      },
      credentials: {
        email: input.ceoEmail,
        temporaryPassword: input.ceoPassword,
        loginUrl: `http://${input.subdomain}.localhost:5173`,
      },
    };
  },
};