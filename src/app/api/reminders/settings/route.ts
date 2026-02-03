import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET - получить настройки напоминаний
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await prisma.reminderSettings.findUnique({
      where: { salonId: session.user.salonId },
    });

    // Создаём дефолтные настройки если нет
    if (!settings) {
      settings = await prisma.reminderSettings.create({
        data: {
          salonId: session.user.salonId,
          reminder24h: true,
          reminder2h: true,
          isActive: true,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching reminder settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT - обновить настройки
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { reminder24h, reminder2h, template24h, template2h, isActive } = body;

    const settings = await prisma.reminderSettings.upsert({
      where: { salonId: session.user.salonId },
      update: {
        reminder24h,
        reminder2h,
        template24h,
        template2h,
        isActive,
      },
      create: {
        salonId: session.user.salonId,
        reminder24h: reminder24h ?? true,
        reminder2h: reminder2h ?? true,
        template24h,
        template2h,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating reminder settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
