import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import prisma from '@/lib/prisma';

interface ImportClient {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  visitsCount?: number;
  totalSpent?: number;
}

// Нормалізація телефону для порівняння
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10); // Останні 10 цифр
}

// POST - масовий імпорт клієнтів
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
    const { clients } = body as { clients: ImportClient[] };

    if (!Array.isArray(clients) || clients.length === 0) {
      return NextResponse.json({ error: 'No clients to import' }, { status: 400 });
    }

    // Отримуємо існуючих клієнтів для перевірки дублікатів
    const existingClients = await prisma.client.findMany({
      where: { salonId: user.salonId },
      select: { phone: true }
    });

    const existingPhones = new Set(
      existingClients.map(c => normalizePhone(c.phone))
    );

    // Фільтруємо та підготовлюємо клієнтів
    const toImport: ImportClient[] = [];
    const skipped: string[] = [];

    for (const client of clients) {
      // Валідація
      if (!client.name || !client.phone) {
        skipped.push(client.name || 'Unknown');
        continue;
      }

      // Перевірка дублікату
      const normalizedPhone = normalizePhone(client.phone);
      if (existingPhones.has(normalizedPhone)) {
        skipped.push(client.name);
        continue;
      }

      // Додаємо до імпорту та запам'ятовуємо телефон
      existingPhones.add(normalizedPhone);
      toImport.push(client);
    }

    // Масовий імпорт
    if (toImport.length > 0) {
      await prisma.client.createMany({
        data: toImport.map(client => ({
          salonId: user.salonId!,
          name: client.name.trim(),
          phone: client.phone.trim(),
          email: client.email?.trim() || null,
          notes: client.notes?.trim() || null,
          visitsCount: client.visitsCount || 0,
          totalSpent: client.totalSpent || 0,
        })),
        skipDuplicates: true,
      });
    }

    // Логуємо в аудит
    await prisma.auditLog.create({
      data: {
        salonId: user.salonId,
        actorType: 'user',
        actorId: session.user.id,
        actorName: session.user.name || session.user.email || 'User',
        action: 'CREATE',
        entityType: 'client',
        entityName: `Import ${toImport.length} clients`,
        changes: {
          imported: toImport.length,
          skipped: skipped.length,
        },
      },
    });

    return NextResponse.json({
      imported: toImport.length,
      skipped: skipped.length,
    });
  } catch (error) {
    console.error('Import clients error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
