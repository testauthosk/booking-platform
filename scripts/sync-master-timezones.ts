/**
 * Скрипт для синхронізації timezone мастерів з їх салонами
 * Запуск: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/sync-master-timezones.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Синхронізація timezone мастерів...\n');

  // Отримуємо всі салони з їх мастерами
  const salons = await prisma.salon.findMany({
    select: {
      id: true,
      name: true,
      timezone: true,
      masters: {
        select: {
          id: true,
          name: true,
          timezone: true,
        }
      }
    }
  });

  let updatedCount = 0;

  for (const salon of salons) {
    console.log(`📍 Салон: ${salon.name} (timezone: ${salon.timezone})`);
    
    for (const master of salon.masters) {
      if (master.timezone !== salon.timezone) {
        console.log(`   ↳ Оновлюю ${master.name}: ${master.timezone} → ${salon.timezone}`);
        
        await prisma.master.update({
          where: { id: master.id },
          data: { timezone: salon.timezone }
        });
        
        updatedCount++;
      } else {
        console.log(`   ↳ ${master.name}: ✓ вже актуально`);
      }
    }
  }

  console.log(`\n✅ Готово! Оновлено мастерів: ${updatedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
