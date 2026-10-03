import { prisma } from '../config/prisma';
import { migrateTenantSchema } from '../db/tenant-migrations-service';

const SAFE_SCHEMA = /^[a-z][a-z0-9_]{2,62}$/;

export const assertSafeSchemaName = (name: string) => {
  if (!SAFE_SCHEMA.test(name)) {
    throw new Error(`Nombre de esquema inválido: ${name}`);
  }
};

/**
 * Crea el esquema del colegio y aplica todas las migraciones registradas.
 * Se llama al crear un nuevo colegio.
 */
export const provisionTenantSchema = async (schemaName: string) => {
  assertSafeSchemaName(schemaName);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  await migrateTenantSchema(schemaName);
};

/**
 * Helpers legacy usados por el módulo demo. Ahora operan sobre el esquema dado.
 */
export const getTenantInfo = async (schemaName: string) => {
  assertSafeSchemaName(schemaName);
  return prisma.$queryRawUnsafe<Array<{ id: string; message: string; created_at: Date }>>(
    `SELECT id, message, created_at FROM "${schemaName}".tenant_info ORDER BY created_at DESC`,
  );
};

export const addTenantInfo = async (schemaName: string, message: string) => {
  assertSafeSchemaName(schemaName);
  return prisma.$executeRawUnsafe(
    `INSERT INTO "${schemaName}".tenant_info (message) VALUES ($1)`,
    message,
  );
};

/**
 * Siembra el catálogo de grados EBR y un año escolar base en un esquema.
 * Idempotente: si ya existen, no hace nada.
 */
export const seedAcademicBaseData = async (schemaName: string) => {
  assertSafeSchemaName(schemaName);

  // Catálogo de grados EBR (Perú)
  const gradeLevels: Array<{ code: string; name: string; level: string; order: number }> = [
    { code: 'INICIAL_3', name: '3 años', level: 'inicial', order: 1 },
    { code: 'INICIAL_4', name: '4 años', level: 'inicial', order: 2 },
    { code: 'INICIAL_5', name: '5 años', level: 'inicial', order: 3 },
    { code: 'PRIM_1', name: '1° Primaria', level: 'primaria', order: 10 },
    { code: 'PRIM_2', name: '2° Primaria', level: 'primaria', order: 11 },
    { code: 'PRIM_3', name: '3° Primaria', level: 'primaria', order: 12 },
    { code: 'PRIM_4', name: '4° Primaria', level: 'primaria', order: 13 },
    { code: 'PRIM_5', name: '5° Primaria', level: 'primaria', order: 14 },
    { code: 'PRIM_6', name: '6° Primaria', level: 'primaria', order: 15 },
    { code: 'SEC_1', name: '1° Secundaria', level: 'secundaria', order: 20 },
    { code: 'SEC_2', name: '2° Secundaria', level: 'secundaria', order: 21 },
    { code: 'SEC_3', name: '3° Secundaria', level: 'secundaria', order: 22 },
    { code: 'SEC_4', name: '4° Secundaria', level: 'secundaria', order: 23 },
    { code: 'SEC_5', name: '5° Secundaria', level: 'secundaria', order: 24 },
  ];

  for (const g of gradeLevels) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "${schemaName}".grade_levels (code, name, level, order_index)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO NOTHING`,
      g.code,
      g.name,
      g.level,
      g.order,
    );
  }

  // Año escolar por defecto (año actual de Perú)
  const currentYear = new Date().getFullYear();
    await prisma.$executeRawUnsafe(
    `INSERT INTO "${schemaName}".academic_years (year, start_date, end_date, is_active)
     VALUES ($1, $2::date, $3::date, true)
     ON CONFLICT (year) DO NOTHING`,
    currentYear,
    `${currentYear}-03-01`,
    `${currentYear}-12-15`,
  );
};