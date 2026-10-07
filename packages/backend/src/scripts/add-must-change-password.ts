import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando must_change_password a users...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false
  `);

  console.log('✅ Columna must_change_password agregada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});