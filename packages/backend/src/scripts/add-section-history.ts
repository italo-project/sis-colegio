import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Creando tabla student_section_history...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true, subdomain: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".student_section_history (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id        UUID NOT NULL REFERENCES "${schema}".students(id) ON DELETE CASCADE,
        section_id        UUID NOT NULL REFERENCES "${schema}".sections(id) ON DELETE RESTRICT,
        academic_year_id  UUID NOT NULL REFERENCES "${schema}".academic_years(id) ON DELETE RESTRICT,
        enrolled_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        left_at           TIMESTAMPTZ,
        average_at_exit   NUMERIC(5,2),
        reason            TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_ssh_student
        ON "${schema}".student_section_history(student_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_ssh_section
        ON "${schema}".student_section_history(section_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_ssh_student_left
        ON "${schema}".student_section_history(student_id, left_at DESC)
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