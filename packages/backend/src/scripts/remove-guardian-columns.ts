import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🧹 Limpiando columnas obsoletas de students...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true, subdomain: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    // Eliminar columnas de apoderado legacy (ahora se maneja con student_parents)
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".students DROP COLUMN IF EXISTS guardian_name`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}".students DROP COLUMN IF EXISTS guardian_phone`,
    );

    console.log(`   ✅ ${schema} limpiado`);
  }

  console.log('✅ Migración completada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});