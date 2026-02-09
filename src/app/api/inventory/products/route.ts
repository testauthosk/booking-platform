import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

async function getAuthUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, salonId: true, name: true, email: true },
  });
  return user;
}

// GET - список товарів
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { salonId: user.salonId },
      include: { category: true },
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

// POST - створити товар
export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.salonId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, sku, barcode, costPrice, sellPrice, quantity, minQuantity, unit, categoryId, image } = body;

    const product = await prisma.product.create({
      data: {
        salonId: user.salonId,
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
      include: { category: true },
    });

    // Якщо є початковий залишок — створюємо рух
    if (quantity && quantity > 0) {
      await prisma.stockMovement.create({
        data: {
          salonId: user.salonId,
          productId: product.id,
          type: 'IN',
          quantity,
          costPrice: costPrice || 0,
          note: 'Початковий залишок',
          actorType: 'admin',
          actorId: user.id,
          actorName: user.name || user.email || 'Owner',
        },
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
