import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with salon
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        salonId: true,
        telegramChatId: true,
        notificationsEnabled: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.salonId) {
      return NextResponse.json({ user, salon: null, data: null });
    }

    // Get salon with all related data
    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            services: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        },
        masters: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true, name: true, role: true, avatar: true, color: true,
            isActive: true, rating: true, reviewCount: true, workingHours: true,
            sortOrder: true, phone: true, email: true,
          }
        },
        _count: {
          select: { clients: true }
        },
        bookings: {
          orderBy: [{ date: 'desc' }, { time: 'asc' }],
          take: 100,
          include: {
            master: { select: { name: true } },
            service: { select: { name: true } }
          }
        }
      }
    });

    if (!salon) {
      return NextResponse.json({ user, salon: null, data: null });
    }

    // Transform to expected format
    const data = {
      salon: {
        ...salon,
        // Map to old field names for compatibility
        short_address: salon.shortAddress,
        working_hours: salon.workingHours || [],
        review_count: salon.reviewCount,
        is_active: salon.isActive,
        logo_url: salon.logo,
      },
      services: salon.categories.flatMap(cat => 
        cat.services.map(s => ({
          ...s,
          category: cat.name,
          category_id: cat.id,
          duration: s.duration,
          is_active: s.isActive,
          sort_order: s.sortOrder,
        }))
      ),
      categories: salon.categories.map(c => ({
        id: c.id,
        name: c.name,
        order_index: c.sortOrder,
      })),
      masters: salon.masters.map(m => ({
        ...m,
        position: m.role,
        photo_url: m.avatar,
        is_active: m.isActive,
        working_hours: m.workingHours,
      })),
      // Count only — full list loaded via /api/clients
      clients: [],
      totalClients: salon._count.clients,
      bookings: salon.bookings.map(b => ({
        id: b.id,
        client_name: b.clientName,
        client_phone: b.clientPhone,
        client_email: b.clientEmail,
        date: b.date,
        time: b.time,
        time_end: b.timeEnd,
        duration: b.duration,
        status: b.status.toLowerCase(),
        service_name: b.service?.name || b.serviceName,
        service_id: b.serviceId,
        master_name: b.master?.name || b.masterName,
        master_id: b.masterId,
        price: b.price,
      })),
    };

    return NextResponse.json({ user, ...data });
  } catch (error) {
    console.error('Dashboard data error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
