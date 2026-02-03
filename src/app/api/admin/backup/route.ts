import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'full';

    const backup: any = {
      exportedAt: new Date().toISOString(),
      type,
      version: '1.0',
    };

    // Export based on type
    switch (type) {
      case 'full':
        backup.salons = await prisma.salon.findMany({
          select: {
            id: true, name: true, slug: true, type: true, description: true,
            phone: true, email: true, address: true, shortAddress: true,
            workingHours: true, amenities: true, timezone: true, currency: true,
            isActive: true, createdAt: true,
          },
        });
        backup.users = await prisma.user.findMany({
          select: {
            id: true, email: true, name: true, phone: true, role: true,
            salonId: true, createdAt: true,
            // Exclude passwordHash
          },
        });
        backup.masters = await prisma.master.findMany({
          select: {
            id: true, salonId: true, name: true, role: true, phone: true,
            email: true, bio: true, rating: true, workingHours: true,
            isActive: true, createdAt: true,
          },
        });
        backup.clients = await prisma.client.findMany({
          select: {
            id: true, salonId: true, name: true, phone: true, email: true,
            telegramChatId: true, visitsCount: true, totalSpent: true,
            lastVisit: true, notes: true, createdAt: true,
          },
        });
        backup.bookings = await prisma.booking.findMany({
          select: {
            id: true, salonId: true, clientId: true, masterId: true, serviceId: true,
            clientName: true, clientPhone: true, serviceName: true, masterName: true,
            date: true, time: true, timeEnd: true, duration: true, price: true,
            status: true, notes: true, createdAt: true,
          },
        });
        backup.services = await prisma.service.findMany({
          select: {
            id: true, salonId: true, categoryId: true, name: true,
            description: true, price: true, duration: true, isActive: true,
          },
        });
        backup.serviceCategories = await prisma.serviceCategory.findMany();
        backup.products = await prisma.product.findMany({
          select: {
            id: true, salonId: true, categoryId: true, name: true,
            description: true, sku: true, costPrice: true, sellPrice: true,
            quantity: true, minQuantity: true, unit: true, isActive: true,
          },
        });
        backup.reviews = await prisma.review.findMany({
          select: {
            id: true, salonId: true, clientId: true, masterId: true,
            authorName: true, rating: true, text: true, createdAt: true,
          },
        });
        break;

      case 'salons':
        backup.salons = await prisma.salon.findMany();
        break;

      case 'users':
        backup.users = await prisma.user.findMany({
          select: {
            id: true, email: true, name: true, phone: true, role: true,
            salonId: true, createdAt: true,
          },
        });
        backup.masters = await prisma.master.findMany({
          select: {
            id: true, salonId: true, name: true, role: true, phone: true,
            email: true, bio: true, isActive: true, createdAt: true,
          },
        });
        break;

      case 'clients':
        backup.clients = await prisma.client.findMany({
          select: {
            id: true, salonId: true, name: true, phone: true, email: true,
            telegramChatId: true, visitsCount: true, totalSpent: true,
            lastVisit: true, notes: true, createdAt: true,
          },
        });
        break;

      case 'bookings':
        backup.bookings = await prisma.booking.findMany();
        break;

      case 'inventory':
        backup.products = await prisma.product.findMany();
        backup.productCategories = await prisma.productCategory.findMany();
        backup.stockMovements = await prisma.stockMovement.findMany({
          take: 10000, // Limit for large datasets
          orderBy: { createdAt: 'desc' },
        });
        break;

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 });
    }

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
