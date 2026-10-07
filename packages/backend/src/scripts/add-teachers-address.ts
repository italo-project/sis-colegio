import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando address a teachers...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".teachers
      ADD COLUMN IF NOT EXISTS address TEXT
    `);

    console.log(`   ✅ ${schema} actualizado`);
  }

  console.log('✅ Migración completada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});