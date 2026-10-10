import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando is_final a attendance_sessions...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true, subdomain: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${schema}".attendance_sessions
      ADD COLUMN IF NOT EXISTS is_final BOOLEAN NOT NULL DEFAULT false
    `);

    console.log(`   ✅ ${schema} actualizado`);
  }

  console.log('🎉 Migración completada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});