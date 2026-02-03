import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check for existing super admin
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, name: true, createdAt: true }
  });

  if (superAdmin) {
    console.log('✅ Super Admin exists:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.name || 'Not set'}`);
    console.log(`   Created: ${superAdmin.createdAt}`);
  } else {
    console.log('❌ No Super Admin found!');
    
    // Create one
    const email = 'superadmin@booking.com';
    const password = 'SuperAdmin123!';
    const passwordHash = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
      }
    });

    console.log('\n✅ Created new Super Admin:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   ID: ${newAdmin.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
