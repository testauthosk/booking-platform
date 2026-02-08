import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * Перевіряє чи онбордінг завершено.
 * Повертає null якщо ок, або NextResponse з помилкою.
 */
export async function requireOnboarding(): Promise<NextResponse | null> {
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
    select: { onboardingCompleted: true },
  });

  if (!salon?.onboardingCompleted) {
    return NextResponse.json(
      { error: 'Завершіть налаштування акаунту перед цією дією', code: 'ONBOARDING_REQUIRED' },
      { status: 403 }
    );
  }

  return null;
}
