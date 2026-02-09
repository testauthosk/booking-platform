import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

// GET — list all content pages
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const pages = await prisma.contentPage.findMany({
      orderBy: { slug: 'asc' },
    });

    return NextResponse.json({ pages });
  } catch (error) {
    console.error('Content pages error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST — create or update content page
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { slug, title, content, isPublished } = await request.json();

    if (!slug || !title) {
      return NextResponse.json({ error: 'slug and title required' }, { status: 400 });
    }

    const page = await prisma.contentPage.upsert({
      where: { slug },
      update: {
        title,
        content: content || '',
        isPublished: isPublished ?? true,
        updatedBy: session.user.email || 'admin',
      },
      create: {
        slug,
        title,
        content: content || '',
        isPublished: isPublished ?? true,
        updatedBy: session.user.email || 'admin',
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('Content update error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE — delete content page
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { slug } = await request.json();
    if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

    await prisma.contentPage.delete({ where: { slug } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Content delete error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
