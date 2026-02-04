import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Знайти салон і мастера Ігор
  const salon = await prisma.salon.findFirst({
    where: { name: { contains: 'Barber' } }
  });
  
  if (!salon) {
    console.log('Салон не знайдено');
    return;
  }
  
  console.log(`Салон: ${salon.name}`);
  
  // Знайти мастера Ігор
  const master = await prisma.master.findFirst({
    where: { 
      salonId: salon.id,
      name: { contains: 'Ігор' }
    }
  });
  
  if (!master) {
    console.log('Мастер Ігор не знайдений');
    // Показати всіх мастерів
    const masters = await prisma.master.findMany({ where: { salonId: salon.id } });
    console.log('Доступні мастери:', masters.map(m => m.name));
    return;
  }
  
  console.log(`Мастер: ${master.name} (${master.id})`);
  
  // Отримати клієнтів салону
  const clients = await prisma.client.findMany({
    where: { salonId: salon.id },
    take: 15
  });
  
  console.log(`Клієнтів: ${clients.length}`);
  
  // Отримати послуги мастера
  const services = await prisma.service.findMany({
    where: { salonId: salon.id },
    take: 3
  });
  
  if (services.length === 0) {
    console.log('Немає послуг');
    return;
  }
  
  console.log(`Послуг: ${services.length}`);
  
  // Створити записи для кожного клієнта (минулі дати)
  const today = new Date();
  
  for (let i = 0; i < clients.length; i++) {
    const client = clients[i];
    const service = services[i % services.length];
    
    // Рандомна дата за останні 30 днів
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const bookingDate = new Date(today);
    bookingDate.setDate(bookingDate.getDate() - daysAgo);
    const dateStr = bookingDate.toISOString().split('T')[0];
    
    // Рандомний час
    const hour = 10 + Math.floor(Math.random() * 8);
    const time = `${hour.toString().padStart(2, '0')}:00`;
    
    try {
      const booking = await prisma.booking.create({
        data: {
          salonId: salon.id,
          masterId: master.id,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          serviceName: service.name,
          masterName: master.name,
          date: dateStr,
          time: time,
          duration: service.duration,
          price: service.price,
          status: 'COMPLETED',
        }
      });
      
      // Оновити статистику клієнта
      await prisma.client.update({
        where: { id: client.id },
        data: {
          visitsCount: { increment: 1 },
          totalSpent: { increment: service.price },
          lastVisit: bookingDate,
        }
      });
      
      console.log(`✓ ${client.name} — ${service.name} (${dateStr})`);
    } catch (e: any) {
      console.log(`✗ ${client.name}: ${e.message}`);
    }
  }
  
  console.log('\nГотово!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
