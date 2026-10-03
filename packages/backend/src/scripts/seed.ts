import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';
import { provisionTenantSchema, addTenantInfo } from '../utils/tenant-schema';

const seedOrg = async (
  name: string,
  subdomain: string,
  schemaName: string,
  ceoEmail: string,
  welcomeMessage: string,
) => {
  const passwordHash = await hashPassword('Password123!');

  const user = await prisma.user.upsert({
    where: { email: ceoEmail },
    update: {},
    create: { email: ceoEmail, passwordHash, fullName: `CEO ${name}` },
  });

  const org = await prisma.organization.upsert({
    where: { subdomain },
    update: {},
    create: { name, subdomain, schemaName },
  });

  await prisma.organizationUser.upsert({
    where: {
      organizationId_userId_role: {
        organizationId: org.id,
        userId: user.id,
        role: 'ceo',
      },
    },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: 'ceo' },
  });

  await provisionTenantSchema(schemaName);

  const existing = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint as count FROM "${schemaName}".tenant_info`,
  );
  if (Number(existing[0].count) === 0) {
    await addTenantInfo(schemaName, welcomeMessage);
  }

  console.log(`✅ Colegio listo: ${name} (${subdomain}.localhost) — CEO: ${ceoEmail}`);
};

const main = async () => {
  await seedOrg(
    'Colegio San Martín',
    'sanmartin',
    'tenant_san_martin',
    'ceo@sanmartin.pe',
    'Bienvenido al Colegio San Martín',
  );
  await seedOrg(
    'Colegio Santa Rosa',
    'santarosa',
    'tenant_santa_rosa',
    'ceo@santarosa.pe',
    'Bienvenido al Colegio Santa Rosa',
  );
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});