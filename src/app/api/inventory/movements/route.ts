import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { StockMovementType } from '@prisma/client';

// GET - история движений
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    const movements = await prisma.stockMovement.findMany({
      where: {
        salonId: session.user.salonId,
        ...(productId && { productId }),
        ...(type && { type: type as StockMovementType }),
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

// POST - создать движение (приход/списание/корректировка)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, type, quantity, costPrice, sellPrice, note } = body;

    // Получаем текущий товар
    const product = await prisma.product.findFirst({
      where: { id: productId, salonId: session.user.salonId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Рассчитываем новый остаток
    let quantityChange = quantity;
    if (type === 'OUT' || type === 'WRITE_OFF' || type === 'SERVICE') {
      quantityChange = -Math.abs(quantity);
    } else if (type === 'ADJUSTMENT') {
      // Для корректировки quantity - это целевое значение
      quantityChange = quantity - product.quantity;
    }

    const newQuantity = product.quantity + quantityChange;

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Недостатньо товару на складі' }, { status: 400 });
    }

    // Создаём движение и обновляем остаток в транзакции
    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          salonId: session.user.salonId,
          productId,
          type: type as StockMovementType,
          quantity: quantityChange,
          costPrice,
          sellPrice,
          note,
          actorType: 'admin',
          actorId: session.user.id,
          actorName: session.user.name || session.user.email,
        },
        include: {
          product: true,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { quantity: newQuantity },
      }),
    ]);

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}
