import { prisma } from '../config/prisma';
import { TENANT_MIGRATIONS } from './tenant-migrations';
import { assertSafeSchemaName } from '../utils/tenant-schema';

/**
 * Crea la tabla de control de migraciones dentro de un esquema.
 */
const ensureMigrationsTable = async (schemaName: string) => {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${schemaName}"._tenant_migrations (
      id           VARCHAR(100) PRIMARY KEY,
      description  TEXT NOT NULL,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
};

/**
 * Aplica las migraciones pendientes a un esquema específico.
 * Ejecuta cada sentencia SQL por separado (PostgreSQL no acepta
 * múltiples comandos en una prepared statement).
 */
export const migrateTenantSchema = async (schemaName: string): Promise<string[]> => {
  assertSafeSchemaName(schemaName);

  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await ensureMigrationsTable(schemaName);

  const applied = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM "${schemaName}"._tenant_migrations`,
  );
  const appliedIds = new Set(applied.map((row) => row.id));

  const newlyApplied: string[] = [];

  for (const migration of TENANT_MIGRATIONS) {
    if (appliedIds.has(migration.id)) continue;

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}"`);

      // Ejecutar cada sentencia por separado
      for (const statement of migration.statements) {
        await tx.$executeRawUnsafe(statement);
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO "${schemaName}"._tenant_migrations (id, description) VALUES ($1, $2)`,
        migration.id,
        migration.description,
      );
    });

    newlyApplied.push(migration.id);
  }

  return newlyApplied;
};

/**
 * Aplica las migraciones pendientes a TODOS los colegios activos.
 */
export const migrateAllTenants = async (): Promise<
  Array<{ subdomain: string; schemaName: string; applied: string[] }>
> => {
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { subdomain: true, schemaName: true },
  });

  const results = [];
  for (const org of orgs) {
    const applied = await migrateTenantSchema(org.schemaName);
    results.push({
      subdomain: org.subdomain,
      schemaName: org.schemaName,
      applied,
    });
  }
  return results;
};