import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Haciendo teacher_id nullable en courses...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true, subdomain: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".courses
      ALTER COLUMN teacher_id DROP NOT NULL
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