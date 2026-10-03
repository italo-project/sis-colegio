import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando columnas de auditoría a organizations...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS deleted_by UUID
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS deletion_reason TEXT
  `);

  console.log('✅ Columnas agregadas');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});