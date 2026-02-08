import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyStaffToken } from '@/lib/staff-auth';

export async function GET(request: NextRequest) {
  const auth = await verifyStaffToken(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone');
  const masterId = searchParams.get('masterId') || auth.masterId;

  if (!phone) {
    return NextResponse.json({ error: 'Phone required' }, { status: 400 });
  }

  try {
    // Find client by phone — only within master's salon
    const client = await prisma.client.findFirst({
      where: { phone, salonId: auth.salonId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
        telegramUsername: true,
        telegramChatId: true,
        createdAt: true,
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Count visits with this master
    const visitsWithMaster = masterId ? await prisma.booking.count({
      where: {
        clientPhone: phone,
        masterId,
        status: 'COMPLETED',
      }
    }) : 0;

    // Sum spent with this master
    const spentWithMasterAgg = masterId ? await prisma.booking.aggregate({
      where: {
        clientPhone: phone,
        masterId,
        status: 'COMPLETED',
      },
      _sum: { price: true }
    }) : { _sum: { price: 0 } };

    // Total visits in salon (scoped to master's salon)
    const visitsCount = await prisma.booking.count({
      where: {
        clientPhone: phone,
        salonId: auth.salonId,
        status: 'COMPLETED',
      }
    });

    // Total spent in salon (scoped to master's salon)
    const totalSpentAgg = await prisma.booking.aggregate({
      where: {
        clientPhone: phone,
        salonId: auth.salonId,
        status: 'COMPLETED',
      },
      _sum: { price: true }
    });

    // Last visit with this master
    const lastVisitWithMaster = masterId ? await prisma.booking.findFirst({
      where: {
        clientPhone: phone,
        masterId,
        status: 'COMPLETED',
      },
      orderBy: { date: 'desc' },
      select: { date: true }
    }) : null;

    return NextResponse.json({
      ...client,
      visitsWithMaster,
      spentWithMaster: spentWithMasterAgg._sum?.price || 0,
      visitsCount,
      totalSpent: totalSpentAgg._sum?.price || 0,
      lastVisitWithMaster: lastVisitWithMaster?.date || null,
    });
  } catch (error) {
    console.error('Error fetching client by phone:', error);
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 });
  }
}
