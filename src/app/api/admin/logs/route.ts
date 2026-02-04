// @ts-nocheck
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const search = searchParams.get('search');
    const salonId = searchParams.get('salonId');

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (action) where.action = action;
    if (salonId) where.salonId = salonId;
    if (search) {
      where.OR = [
        { actorName: { contains: search, mode: 'insensitive' } },
        { entityName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          // Join salon name if needed
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    // Get salon names
    const salonIds = [...new Set(logs.map(l => l.salonId))];
    const salons = await prisma.salon.findMany({
      where: { id: { in: salonIds } },
      select: { id: true, name: true },
    });
    const salonMap = new Map(salons.map(s => [s.id, s]));

    const logsWithSalons = logs.map(log => ({
      ...log,
      salon: salonMap.get(log.salonId),
    }));

    return NextResponse.json({
      logs: logsWithSalons,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}
