import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';
import { generateSlug } from '@/lib/slug';

interface OnboardingData {
  lastStep?: number;
  companyName?: string;
  website?: string;
  categories?: string[];
  accountType?: string;
  serviceLocation?: string;
  previousPlatform?: string;
  completedAt?: string;
}

// GET - завантажити прогрес онбордінгу
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      select: {
        onboardingData: true,
        onboardingCompleted: true,
        name: true,
        type: true,
        previousPlatform: true,
      },
    });

    return NextResponse.json({
      completed: salon?.onboardingCompleted ?? false,
      data: (salon?.onboardingData as OnboardingData) || {},
      salon: {
        name: salon?.name,
        type: salon?.type,
        previousPlatform: salon?.previousPlatform,
      },
    });
  } catch (error) {
    console.error('Onboarding GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - зберегти прогрес кроку або завершити онбордінг
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { salonId: true },
    });

    if (!user?.salonId) {
      return NextResponse.json({ error: 'No salon' }, { status: 400 });
    }

    const raw = await request.text();
    if (raw.length > 10_000) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { step, data, complete } = body as {
      step?: number;
      data?: Partial<OnboardingData>;
      complete?: boolean;
    };

    // Завантажуємо поточний прогрес
    const salon = await prisma.salon.findUnique({
      where: { id: user.salonId },
      select: { onboardingData: true },
    });

    const existing = (salon?.onboardingData as OnboardingData) || {};
    const merged: OnboardingData = { ...existing, ...data };

    if (step) {
      merged.lastStep = Math.max(step, existing.lastStep || 0);
    }

    // Оновлюємо salon fields з онбордінг-даних
    const salonUpdate: Record<string, unknown> = {
      onboardingData: merged,
    };

    // Назва та slug
    if (merged.companyName) {
      salonUpdate.name = merged.companyName;

      const baseSlug = generateSlug(merged.companyName);

      const existingSlug = await prisma.salon.findUnique({ where: { slug: baseSlug } });
      salonUpdate.slug = existingSlug && existingSlug.id !== user.salonId
        ? `${baseSlug}-${Date.now().toString(36)}`
        : baseSlug;
    }

    // Тип бізнесу
    if (merged.categories && merged.categories.length > 0) {
      // Перший вибраний = основний тип
      const categoryNames: Record<string, string> = {
        barbershop: 'Барбершоп', nails: 'Манікюр', brows: 'Брови та вії',
        beauty: 'Салон краси', spa: 'Спа & масаж', fitness: 'Фітнес',
        tanning: 'Солярій', tattoo: 'Тату & пірсинг', medical: 'Медичні послуги',
        pets: 'Грумінг', other: 'Інше',
      };
      salonUpdate.type = categoryNames[merged.categories[0]] || 'Інше';
    }

    // Попередній софт
    if (merged.previousPlatform) {
      salonUpdate.previousPlatform = merged.previousPlatform;
    }

    // Завершення
    if (complete) {
      merged.completedAt = new Date().toISOString();
      salonUpdate.onboardingData = merged;
      salonUpdate.onboardingCompleted = true;
    }

    await prisma.salon.update({
      where: { id: user.salonId },
      data: salonUpdate,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Onboarding save error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
