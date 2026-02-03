import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET - all products across all salons
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const salonId = searchParams.get('salonId');
    const lowStock = searchParams.get('lowStock');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (salonId) where.salonId = salonId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Products
    let products = await prisma.product.findMany({
      where,
      include: {
        salon: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
    });

    // Filter low stock after fetch (comparing quantity to minQuantity)
    if (lowStock === 'true') {
      products = products.filter(p => p.quantity <= p.minQuantity);
    }

    const total = products.length;
    const paginatedProducts = products.slice((page - 1) * limit, page * limit);

    // Stats
    const allProducts = await prisma.product.findMany({
      select: { quantity: true, costPrice: true, sellPrice: true, minQuantity: true },
    });

    const totalProducts = allProducts.length;
    const lowStockCount = allProducts.filter(p => p.quantity <= p.minQuantity).length;
    const totalCostValue = allProducts.reduce((sum, p) => sum + p.quantity * p.costPrice, 0);
    const totalSellValue = allProducts.reduce((sum, p) => sum + p.quantity * p.sellPrice, 0);

    // Recent movements
    const recentMovements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        product: { select: { name: true } },
      },
    });

    return NextResponse.json({
      products: paginatedProducts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalProducts,
        lowStockCount,
        totalCostValue,
        totalSellValue,
        potentialProfit: totalSellValue - totalCostValue,
      },
      recentMovements,
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}
