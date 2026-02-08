import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

// POST - зберегти дані онбордінгу
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true }
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const body = await request.json();
    const { name, website, type, previousPlatform, accountType, serviceLocation } = body;

    // Генеруємо slug з назви якщо вона є
    let slug: string | undefined;
    if (name) {
      const baseSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9а-яіїєґ\s]/gi, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
      
      // Перевіряємо унікальність
      const existing = await prisma.salon.findUnique({ where: { slug: baseSlug } });
      slug = existing && existing.id !== user.salonId 
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;
    }

    await prisma.salon.update({
      where: { id: user.salonId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(type && { type }),
        ...(previousPlatform && { previousPlatform }),
        onboardingData: {
          accountType: accountType || null,
          serviceLocation: serviceLocation || null,
          website: website || null,
          completedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding save error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
