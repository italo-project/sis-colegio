import { prisma } from '../config/prisma';
import { hashPassword } from '../utils/password';

const main = async () => {
  console.log('🔧 Agregando campo is_super_admin a users...');

  // Agregar la columna
  await prisma.$executeRawUnsafe(`
    ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT false
  `);

  console.log('✅ Columna agregada');

  // Crear el super-admin si no existe
  const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@sistema.com';
  const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';

  const existing = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM public.users WHERE email = $1 LIMIT 1`,
    SUPER_ADMIN_EMAIL,
  );

  if (existing.length > 0) {
    // Ya existe: solo marcar como super admin
    await prisma.$executeRawUnsafe(
      `UPDATE public.users SET is_super_admin = true WHERE email = $1`,
      SUPER_ADMIN_EMAIL,
    );
    console.log(`✅ Usuario existente ${SUPER_ADMIN_EMAIL} marcado como super-admin`);
  } else {
    // Crear el usuario
    const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);
    await prisma.$executeRawUnsafe(
  `INSERT INTO public.users (id, email, password_hash, full_name, is_super_admin)
   VALUES (gen_random_uuid(), $1, $2, $3, true)`,
  SUPER_ADMIN_EMAIL,
  passwordHash,
  'Super Administrador',
);
    console.log(`✅ Super-admin creado: ${SUPER_ADMIN_EMAIL}`);
    console.log(`   Contraseña: ${SUPER_ADMIN_PASSWORD}`);
    console.log(`   ⚠️  Cámbiala al primer login`);
  }

  await prisma.$disconnect();
};

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});