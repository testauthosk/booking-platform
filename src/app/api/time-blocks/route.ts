import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// GET - отримати блокування для дати
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const date = searchParams.get('date');
    const masterId = searchParams.get('masterId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId required' }, { status: 400 });
    }

    const where: any = { salonId };
    
    if (date) {
      where.date = date;
    }
    
    if (masterId) {
      where.masterId = masterId;
    }

    const timeBlocks = await prisma.timeBlock.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(timeBlocks);
  } catch (error) {
    console.error('TimeBlocks GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - створити блокування
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { salonId, masterId, date, startTime, endTime, title, type, isAllDay, repeat, color } = body;

    if (!salonId || !date || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const timeBlock = await prisma.timeBlock.create({
      data: {
        salonId,
        masterId: masterId || null,
        date,
        startTime,
        endTime,
        title: title || null,
        type: type || 'BREAK',
        isAllDay: isAllDay || false,
        repeat: repeat || null,
        color: color || null,
      },
    });

    return NextResponse.json(timeBlock);
  } catch (error) {
    console.error('TimeBlocks POST error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - видалити блокування
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.timeBlock.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TimeBlocks DELETE error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
