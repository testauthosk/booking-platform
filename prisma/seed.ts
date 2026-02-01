import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Создаём демо салон
  const salon = await prisma.salon.upsert({
    where: { slug: 'demo-salon' },
    update: {},
    create: {
      id: 'demo-salon-id',
      name: 'BookingPro Demo',
      slug: 'demo-salon',
      type: 'Салон краси',
      description: 'Демонстраційний салон для тестування платформи BookingPro. Тут ви можете випробувати всі функції системи.',
      phone: '+380 99 123 4567',
      email: 'demo@bookingpro.com',
      address: 'м. Київ, вул. Хрещатик, 22',
      shortAddress: 'Хрещатик, 22',
      latitude: 50.4501,
      longitude: 30.5234,
      photos: [
        'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&h=600&fit=crop',
      ],
      workingHours: [
        { day: 'Понеділок', hours: '09:00 - 20:00' },
        { day: 'Вівторок', hours: '09:00 - 20:00' },
        { day: 'Середа', hours: '09:00 - 20:00' },
        { day: 'Четвер', hours: '09:00 - 20:00' },
        { day: "П'ятниця", hours: '09:00 - 20:00' },
        { day: 'Субота', hours: '10:00 - 18:00' },
        { day: 'Неділя', hours: 'Зачинено' },
      ],
      amenities: [
        'Wi-Fi',
        'Кава та чай',
        'Кондиціонер',
        'Паркування поруч',
      ],
      rating: 4.9,
      reviewCount: 127,
    },
  });

  console.log('✅ Created salon:', salon.name);

  // Создаём категории услуг
  const categories = await Promise.all([
    prisma.serviceCategory.upsert({
      where: { id: 'cat-hair' },
      update: {},
      create: {
        id: 'cat-hair',
        salonId: salon.id,
        name: 'Волосся',
        sortOrder: 1,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { id: 'cat-nails' },
      update: {},
      create: {
        id: 'cat-nails',
        salonId: salon.id,
        name: 'Нігті',
        sortOrder: 2,
      },
    }),
    prisma.serviceCategory.upsert({
      where: { id: 'cat-face' },
      update: {},
      create: {
        id: 'cat-face',
        salonId: salon.id,
        name: 'Обличчя',
        sortOrder: 3,
      },
    }),
  ]);

  console.log('✅ Created categories:', categories.length);

  // Создаём услуги
  const services = await Promise.all([
    // Волосся
    prisma.service.upsert({
      where: { id: 'svc-haircut' },
      update: {},
      create: {
        id: 'svc-haircut',
        salonId: salon.id,
        categoryId: 'cat-hair',
        name: 'Стрижка',
        description: 'Класична стрижка з миттям голови',
        price: 500,
        duration: 45,
        sortOrder: 1,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-coloring' },
      update: {},
      create: {
        id: 'svc-coloring',
        salonId: salon.id,
        categoryId: 'cat-hair',
        name: 'Фарбування',
        description: 'Професійне фарбування волосся',
        price: 1200,
        priceFrom: true,
        duration: 120,
        sortOrder: 2,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-styling' },
      update: {},
      create: {
        id: 'svc-styling',
        salonId: salon.id,
        categoryId: 'cat-hair',
        name: 'Укладка',
        description: 'Укладка феном або плойкою',
        price: 400,
        duration: 30,
        sortOrder: 3,
      },
    }),
    // Нігті
    prisma.service.upsert({
      where: { id: 'svc-manicure' },
      update: {},
      create: {
        id: 'svc-manicure',
        salonId: salon.id,
        categoryId: 'cat-nails',
        name: 'Манікюр',
        description: 'Класичний або апаратний манікюр',
        price: 350,
        duration: 60,
        sortOrder: 1,
      },
    }),
    prisma.service.upsert({
      where: { id: 'svc-pedicure' },
      update: {},
      create: {
        id: 'svc-pedicure',
        salonId: salon.id,
        categoryId: 'cat-nails',
        name: 'Педікюр',
        description: 'Класичний або апаратний педікюр',
        price: 450,
        duration: 90,
        sortOrder: 2,
      },
    }),
    // Обличчя
    prisma.service.upsert({
      where: { id: 'svc-brows' },
      update: {},
      create: {
        id: 'svc-brows',
        salonId: salon.id,
        categoryId: 'cat-face',
        name: 'Корекція брів',
        description: 'Корекція форми та фарбування',
        price: 250,
        duration: 30,
        sortOrder: 1,
      },
    }),
  ]);

  console.log('✅ Created services:', services.length);

  // Создаём мастеров
  const masters = await Promise.all([
    prisma.master.upsert({
      where: { id: 'master-1' },
      update: {},
      create: {
        id: 'master-1',
        salonId: salon.id,
        name: 'Анна Коваленко',
        role: 'Стиліст',
        phone: '+380 99 111 1111',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        bio: 'Досвід роботи 8 років. Спеціалізація: фарбування, стрижки.',
        rating: 4.9,
        reviewCount: 45,
        price: 500,
      },
    }),
    prisma.master.upsert({
      where: { id: 'master-2' },
      update: {},
      create: {
        id: 'master-2',
        salonId: salon.id,
        name: 'Марія Петренко',
        role: 'Майстер манікюру',
        phone: '+380 99 222 2222',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
        bio: 'Досвід роботи 5 років. Спеціалізація: нарощування, дизайн.',
        rating: 5.0,
        reviewCount: 38,
        price: 350,
      },
    }),
    prisma.master.upsert({
      where: { id: 'master-3' },
      update: {},
      create: {
        id: 'master-3',
        salonId: salon.id,
        name: 'Олена Шевченко',
        role: 'Бровіст',
        phone: '+380 99 333 3333',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
        bio: 'Досвід роботи 3 роки. Спеціалізація: брови, ламінування.',
        rating: 4.8,
        reviewCount: 22,
        price: 250,
      },
    }),
  ]);

  console.log('✅ Created masters:', masters.length);

  // Связываем мастеров с услугами
  await Promise.all([
    // Анна - волосся
    prisma.masterService.upsert({
      where: { id: 'ms-1-1' },
      update: {},
      create: { id: 'ms-1-1', masterId: 'master-1', serviceId: 'svc-haircut' },
    }),
    prisma.masterService.upsert({
      where: { id: 'ms-1-2' },
      update: {},
      create: { id: 'ms-1-2', masterId: 'master-1', serviceId: 'svc-coloring' },
    }),
    prisma.masterService.upsert({
      where: { id: 'ms-1-3' },
      update: {},
      create: { id: 'ms-1-3', masterId: 'master-1', serviceId: 'svc-styling' },
    }),
    // Марія - нігті
    prisma.masterService.upsert({
      where: { id: 'ms-2-1' },
      update: {},
      create: { id: 'ms-2-1', masterId: 'master-2', serviceId: 'svc-manicure' },
    }),
    prisma.masterService.upsert({
      where: { id: 'ms-2-2' },
      update: {},
      create: { id: 'ms-2-2', masterId: 'master-2', serviceId: 'svc-pedicure' },
    }),
    // Олена - обличчя
    prisma.masterService.upsert({
      where: { id: 'ms-3-1' },
      update: {},
      create: { id: 'ms-3-1', masterId: 'master-3', serviceId: 'svc-brows' },
    }),
  ]);

  console.log('✅ Linked masters with services');

  // Создаём отзывы
  await Promise.all([
    prisma.review.upsert({
      where: { id: 'review-1' },
      update: {},
      create: {
        id: 'review-1',
        salonId: salon.id,
        masterId: 'master-1',
        authorName: 'Ольга М.',
        authorInitial: 'О',
        authorColor: 'bg-pink-500',
        rating: 5,
        text: 'Чудовий салон! Анна зробила ідеальну стрижку, я дуже задоволена результатом.',
        serviceName: 'Стрижка',
      },
    }),
    prisma.review.upsert({
      where: { id: 'review-2' },
      update: {},
      create: {
        id: 'review-2',
        salonId: salon.id,
        masterId: 'master-2',
        authorName: 'Катерина С.',
        authorInitial: 'К',
        authorColor: 'bg-purple-500',
        rating: 5,
        text: 'Найкращий манікюр в місті! Марія справжній професіонал.',
        serviceName: 'Манікюр',
      },
    }),
    prisma.review.upsert({
      where: { id: 'review-3' },
      update: {},
      create: {
        id: 'review-3',
        salonId: salon.id,
        masterId: 'master-3',
        authorName: 'Анастасія Л.',
        authorInitial: 'А',
        authorColor: 'bg-blue-500',
        rating: 5,
        text: 'Нарешті знайшла свого майстра! Олена робить ідеальні брови.',
        serviceName: 'Корекція брів',
      },
    }),
  ]);

  console.log('✅ Created reviews');

  console.log('🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
