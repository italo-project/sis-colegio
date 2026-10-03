import { migrateAllTenants } from '../db/tenant-migrations-service';
import { seedAcademicBaseData } from '../utils/tenant-schema';
import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔄 Migrando todos los colegios activos...\n');
  const results = await migrateAllTenants();

  for (const r of results) {
    if (r.applied.length === 0) {
      console.log(`✅ ${r.subdomain} (${r.schemaName}) — al día`);
    } else {
      console.log(`✅ ${r.subdomain} (${r.schemaName}) — aplicadas: ${r.applied.join(', ')}`);
    }
  }

  console.log('\n🌱 Sembrando datos académicos base...\n');
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { subdomain: true, schemaName: true },
  });
  for (const org of orgs) {
    await seedAcademicBaseData(org.schemaName);
    console.log(`✅ ${org.subdomain} — grados y año escolar listos`);
  }

  console.log('\n🎉 Migraciones y seed completados');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});