import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'igor@booking-admin.com';
  const password = 'Booking2026!Super';
  const passwordHash = await bcrypt.hash(password, 10);

  // Delete old superadmin if exists
  await prisma.user.deleteMany({
    where: { email: 'superadmin@booking.com' }
  });

  // Create or update Igor's admin
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      name: 'Igor (Super Admin)',
    },
    create: {
      email,
      passwordHash,
      name: 'Igor (Super Admin)',
      role: 'SUPER_ADMIN',
    }
  });

  console.log('✅ Super Admin готовий:');
  console.log(`\n   🔗 URL: https://booking-platform-ruddy.vercel.app/admin/login`);
  console.log(`   📧 Email: ${email}`);
  console.log(`   🔑 Password: ${password}`);
  console.log(`\n   ⚠️  Зміни пароль після першого входу!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
