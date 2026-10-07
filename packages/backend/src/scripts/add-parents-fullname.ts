import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando full_name a parents...');

  // Agregar columna
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name_backup TEXT
  `);

  // Iterar por todos los esquemas de tenant
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".parents ADD COLUMN IF NOT EXISTS full_name VARCHAR(200)`,
    );

    // Poblar full_name desde first_name + last_name
    await prisma.$executeRawUnsafe(
      `UPDATE "${schema}".parents
       SET full_name = TRIM(CONCAT(first_name, ' ', COALESCE(last_name, '')))
       WHERE full_name IS NULL`,
    );

    // Hacer NOT NULL
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".parents ALTER COLUMN full_name SET NOT NULL`,
    );

    // Eliminar columnas viejas
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".parents DROP COLUMN IF EXISTS first_name`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".parents DROP COLUMN IF EXISTS last_name`,
    );
  }

  console.log('✅ Migración completada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});