import { prisma } from '../config/prisma';

const main = async () => {
  console.log('🔧 Creando tabla student_year_end_status...');

  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { schemaName: true, subdomain: true },
  });

  for (const org of orgs) {
    const schema = org.schemaName;
    console.log(`   Procesando ${schema}...`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${schema}".student_year_end_status (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id        UUID NOT NULL REFERENCES "${schema}".students(id) ON DELETE CASCADE,
        academic_year_id  UUID NOT NULL REFERENCES "${schema}".academic_years(id) ON DELETE RESTRICT,
        final_average     NUMERIC(5,2),
        status            VARCHAR(20) NOT NULL
                          CHECK (status IN ('promoted', 'repeated', 'graduated', 'transferred')),
        next_section_id   UUID REFERENCES "${schema}".sections(id) ON DELETE SET NULL,
        notes             TEXT,
        closed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        closed_by         UUID NOT NULL,
        UNIQUE (student_id, academic_year_id)
      )
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_syes_student
        ON "${schema}".student_year_end_status(student_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_syes_year
        ON "${schema}".student_year_end_status(academic_year_id)
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_syes_status
        ON "${schema}".student_year_end_status(status)
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