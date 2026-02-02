import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/audit-log - история изменений
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: { salonId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where: { salonId } }),
    ]);

    return NextResponse.json({ logs, total });
  } catch (error) {
    console.error('GET /api/audit-log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
