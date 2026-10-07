import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Migrando estructura de teachers...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    // 1. Agregar columnas nuevas
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20)
      CHECK (payment_type IN ('hourly', 'monthly') OR payment_type IS NULL)
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2)
      CHECK (hourly_rate IS NULL OR hourly_rate >= 0)
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(10,2)
      CHECK (monthly_salary IS NULL OR monthly_salary >= 0)
    `);

    // 2. Poblar full_name desde first_name + last_name
    await prisma.$executeRawUnsafe(`
      UPDATE "${schema}".teachers
      SET full_name = TRIM(CONCAT(first_name, ' ', COALESCE(last_name, '')))
      WHERE full_name IS NULL
    `);

    // 3. Hacer full_name NOT NULL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ALTER COLUMN full_name SET NOT NULL
    `);

    // 4. Eliminar columnas viejas
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      DROP COLUMN IF EXISTS first_name
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      DROP COLUMN IF EXISTS last_name
    `);

    console.log(`   ✅ ${schema} migrado`);
  }

  console.log('✅ Migración completada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});