import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { StockMovementType } from '@prisma/client';

async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, salonId: true, name: true, email: true },
  });
  return user;
}

// GET - історія рухів
export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');

    const movements = await prisma.stockMovement.findMany({
      where: {
        salonId: user.salonId,
        ...(productId && { productId }),
        ...(type && { type: type as StockMovementType }),
      },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 500),
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error('Error fetching movements:', error);
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 });
  }
}

// POST - створити рух (прихід/списання/коригування)
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, type, quantity, costPrice, sellPrice, note } = body;

    // Verify product belongs to this salon
    const product = await prisma.product.findFirst({
      where: { id: productId, salonId: user.salonId },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Розраховуємо новий залишок
    let quantityChange = quantity;
    if (type === 'OUT' || type === 'WRITE_OFF' || type === 'SERVICE') {
      quantityChange = -Math.abs(quantity);
    } else if (type === 'ADJUSTMENT') {
      quantityChange = quantity - product.quantity;
    }

    const newQuantity = product.quantity + quantityChange;

    if (newQuantity < 0) {
      return NextResponse.json({ error: 'Недостатньо товару на складі' }, { status: 400 });
    }

    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: {
          salonId: user.salonId,
          productId,
          type: type as StockMovementType,
          quantity: quantityChange,
          costPrice,
          sellPrice,
          note,
          actorType: 'admin',
          actorId: user.id,
          actorName: user.name || user.email || 'Owner',
        },
        include: { product: true },
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
