import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create test user (salon owner)
  const passwordHash = await bcrypt.hash('test123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'owner@test.com' },
    update: {},
    create: {
      email: 'owner@test.com',
      passwordHash,
      name: 'Тест Владелец',
      role: 'SALON_OWNER',
      notificationsEnabled: true,
    },
  });
  console.log('✅ User created:', user.email);

  // 2. Create test salon
  const salon = await prisma.salon.upsert({
    where: { slug: 'barber-test' },
    update: {},
    create: {
      name: 'The Barber Shop',
      slug: 'barber-test',
      type: 'Барбершоп',
      description: 'Найкращий барбершоп у місті. Стильні стрижки, класичне гоління та догляд за бородою.',
      phone: '+380 99 123 4567',
      email: 'hello@barbershop.test',
      address: 'вул. Хрещатик, 1, Київ, 01001',
      shortAddress: 'Хрещатик, 1',
      latitude: 50.4501,
      longitude: 30.5234,
      photos: [
        'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800',
        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800',
        'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800',
      ],
      workingHours: [
        { day: 'Понеділок', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Вівторок', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Середа', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Четвер', is_working: true, open: '09:00', close: '20:00' },
        { day: "П'ятниця", is_working: true, open: '09:00', close: '20:00' },
        { day: 'Субота', is_working: true, open: '10:00', close: '18:00' },
        { day: 'Неділя', is_working: false, open: '', close: '' },
      ],
      amenities: ['Wi-Fi', 'Кава', 'Кондиціонер', 'Парковка'],
      rating: 4.9,
      reviewCount: 127,
      isActive: true,
      ownerId: user.id,
    },
  });
  console.log('✅ Salon created:', salon.name);

  // Update user with salon
  await prisma.user.update({
    where: { id: user.id },
    data: { salonId: salon.id },
  });

  // 3. Create service categories
  const catHair = await prisma.serviceCategory.upsert({
    where: { id: 'cat-hair' },
    update: {},
    create: {
      id: 'cat-hair',
      salonId: salon.id,
      name: 'СТРИЖКА',
      sortOrder: 1,
    },
  });

  const catBeard = await prisma.serviceCategory.upsert({
    where: { id: 'cat-beard' },
    update: {},
    create: {
      id: 'cat-beard',
      salonId: salon.id,
      name: 'БОРОДА',
      sortOrder: 2,
    },
  });

  const catComplex = await prisma.serviceCategory.upsert({
    where: { id: 'cat-complex' },
    update: {},
    create: {
      id: 'cat-complex',
      salonId: salon.id,
      name: 'КОМПЛЕКСИ',
      sortOrder: 3,
    },
  });
  console.log('✅ Categories created');

  // 4. Create services
  const services = [
    { id: 'svc-1', categoryId: catHair.id, name: 'Чоловіча стрижка', duration: 45, price: 450 },
    { id: 'svc-2', categoryId: catHair.id, name: 'Стрижка машинкою', duration: 30, price: 300 },
    { id: 'svc-3', categoryId: catHair.id, name: 'Дитяча стрижка', duration: 30, price: 350 },
    { id: 'svc-4', categoryId: catBeard.id, name: 'Оформлення бороди', duration: 30, price: 300 },
    { id: 'svc-5', categoryId: catBeard.id, name: 'Гоління', duration: 45, price: 400 },
    { id: 'svc-6', categoryId: catBeard.id, name: 'Королівське гоління', duration: 60, price: 600 },
    { id: 'svc-7', categoryId: catComplex.id, name: 'Стрижка + борода', duration: 75, price: 700 },
    { id: 'svc-8', categoryId: catComplex.id, name: 'Повний комплекс', duration: 90, price: 900, priceFrom: true },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      update: {},
      create: {
        id: svc.id,
        salonId: salon.id,
        categoryId: svc.categoryId,
        name: svc.name,
        duration: svc.duration,
        price: svc.price,
        priceFrom: svc.priceFrom || false,
        isActive: true,
        sortOrder: services.indexOf(svc) + 1,
      },
    });
  }
  console.log('✅ Services created:', services.length);

  // 5. Create masters
  const masters = [
    {
      id: 'master-1',
      name: 'Олександр',
      role: 'Головний барбер',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
      rating: 5.0,
      reviewCount: 89,
      price: 450,
    },
    {
      id: 'master-2',
      name: 'Максим',
      role: 'Барбер',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
      rating: 4.8,
      reviewCount: 54,
      price: 400,
    },
    {
      id: 'master-3',
      name: 'Денис',
      role: 'Барбер-стиліст',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
      rating: 4.9,
      reviewCount: 38,
      price: 450,
    },
  ];

  for (const m of masters) {
    await prisma.master.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        salonId: salon.id,
        name: m.name,
        role: m.role,
        avatar: m.avatar,
        rating: m.rating,
        reviewCount: m.reviewCount,
        price: m.price,
        isActive: true,
        sortOrder: masters.indexOf(m) + 1,
      },
    });
  }
  console.log('✅ Masters created:', masters.length);

  // 6. Create some reviews
  const reviews = [
    { authorName: 'Андрій К.', authorInitial: 'А', authorColor: 'bg-blue-500', rating: 5, text: 'Відмінний сервіс! Олександр зробив ідеальну стрижку.' },
    { authorName: 'Віталій М.', authorInitial: 'В', authorColor: 'bg-green-500', rating: 5, text: 'Найкращий барбершоп у місті. Рекомендую всім!' },
    { authorName: 'Сергій Л.', authorInitial: 'С', authorColor: 'bg-purple-500', rating: 4, text: 'Гарна атмосфера, професійні майстри.' },
    { authorName: 'Олег П.', authorInitial: 'О', authorColor: 'bg-orange-500', rating: 5, text: 'Королівське гоління — це щось неймовірне!' },
  ];

  for (let i = 0; i < reviews.length; i++) {
    const r = reviews[i];
    await prisma.review.upsert({
      where: { id: `review-${i + 1}` },
      update: {},
      create: {
        id: `review-${i + 1}`,
        salonId: salon.id,
        masterId: masters[i % masters.length].id,
        authorName: r.authorName,
        authorInitial: r.authorInitial,
        authorColor: r.authorColor,
        rating: r.rating,
        text: r.text,
        isVisible: true,
      },
    });
  }
  console.log('✅ Reviews created:', reviews.length);

  console.log('\n🎉 Seed completed!\n');
  console.log('📧 Login: owner@test.com');
  console.log('🔑 Password: test123');
  console.log('🌐 Salon page: /salon/barber-test');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
