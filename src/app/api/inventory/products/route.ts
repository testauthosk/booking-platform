import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - список товаров
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { salonId: session.user.salonId },
      include: {
        category: true,
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST - создать товар
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, sku, barcode, costPrice, sellPrice, quantity, minQuantity, unit, categoryId, image } = body;

    const product = await prisma.product.create({
      data: {
        salonId: session.user.salonId,
        name,
        description,
        sku,
        barcode,
        costPrice: costPrice || 0,
        sellPrice: sellPrice || 0,
        quantity: quantity || 0,
        minQuantity: minQuantity || 0,
        unit: unit || 'шт',
        categoryId,
        image,
      },
      include: {
        category: true,
      },
    });

    // Если есть начальный остаток, создаём движение
    if (quantity && quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          salonId: session.user.salonId,
          productId: product.id,
          type: 'IN',
          quantity,
          costPrice: costPrice || 0,
          note: 'Початковий залишок',
          actorType: 'admin',
          actorId: session.user.id,
          actorName: session.user.name || session.user.email,
        },
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
