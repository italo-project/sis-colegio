import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Creando tabla audit_logs...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS public.audit_logs (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_user_id      UUID NOT NULL,
      actor_email        VARCHAR(255) NOT NULL,
      action             VARCHAR(100) NOT NULL,
      target_type        VARCHAR(50),
      target_id          UUID,
      target_name        VARCHAR(255),
      organization_id    UUID,
      organization_name  VARCHAR(255),
      metadata           JSONB,
      ip_address         VARCHAR(45),
      user_agent         TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC)
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id)
  `);

  console.log('✅ Tabla audit_logs creada');
  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});