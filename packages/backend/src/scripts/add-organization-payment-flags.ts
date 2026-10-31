import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Agregando columnas de métodos de pago a organizations...');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS payment_gateway_enabled BOOLEAN NOT NULL DEFAULT false
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS payment_manual_enabled BOOLEAN NOT NULL DEFAULT true
  `);

  console.log('✅ Columnas agregadas:');
  console.log('   - payment_gateway_enabled (default: false)');
  console.log('   - payment_manual_enabled  (default: true)');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});