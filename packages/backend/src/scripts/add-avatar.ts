import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando avatar_url a users...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT
  `);

  console.log('✅ Columna avatar_url agregada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});