import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testClients = [
  { name: 'Олена Коваленко', phone: '+380501234501' },
  { name: 'Марія Шевченко', phone: '+380671234502' },
  { name: 'Анна Бондаренко', phone: '+380931234503' },
  { name: 'Наталія Ткаченко', phone: '+380501234504' },
  { name: 'Ірина Мельник', phone: '+380671234505' },
  { name: 'Юлія Кравченко', phone: '+380931234506' },
  { name: 'Тетяна Савченко', phone: '+380501234507' },
  { name: 'Оксана Руденко', phone: '+380671234508' },
  { name: 'Вікторія Поліщук', phone: '+380931234509' },
  { name: 'Катерина Гончаренко', phone: '+380501234510' },
  { name: 'Світлана Лисенко', phone: '+380671234511' },
  { name: 'Людмила Петренко', phone: '+380931234512' },
  { name: 'Дарина Сидоренко', phone: '+380501234513' },
  { name: 'Аліна Федоренко', phone: '+380671234514' },
  { name: 'Софія Іванченко', phone: '+380931234515' },
];

async function main() {
  // Знайти салон
  const salon = await prisma.salon.findFirst({
    where: { name: { contains: 'Barber' } }
  });
  
  if (!salon) {
    console.log('Салон не знайдено');
    return;
  }
  
  console.log(`Салон: ${salon.name} (${salon.id})`);
  
  // Створити клієнтів
  for (const client of testClients) {
    try {
      const created = await prisma.client.create({
        data: {
          salonId: salon.id,
          name: client.name,
          phone: client.phone,
          visitsCount: Math.floor(Math.random() * 10),
          totalSpent: Math.floor(Math.random() * 5000),
        }
      });
      console.log(`✓ ${created.name}`);
    } catch (e: any) {
      if (e.code === 'P2002') {
        console.log(`⏭ ${client.name} (вже існує)`);
      } else {
        console.log(`✗ ${client.name}: ${e.message}`);
      }
    }
  }
  
  const count = await prisma.client.count({ where: { salonId: salon.id } });
  console.log(`\nВсього клієнтів: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
