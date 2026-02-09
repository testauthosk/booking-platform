import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE', 'CALL', 'SET ', 'COPY',
];

const PRESETS = [
  { name: 'Всі салони', query: 'SELECT id, name, slug, "isActive", "createdAt" FROM "Salon" ORDER BY "createdAt" DESC', category: 'salons' },
  { name: 'Всі користувачі', query: 'SELECT id, email, name, role, "salonId", "createdAt" FROM "User" ORDER BY "createdAt" DESC', category: 'users' },
  { name: 'Бронювання сьогодні', query: `SELECT b.id, b."clientName", b."serviceName", b.date, b.time, b.status, s.name as salon FROM "Booking" b JOIN "Salon" s ON b."salonId" = s.id WHERE b.date = CURRENT_DATE ORDER BY b.time`, category: 'bookings' },
  { name: 'Топ клієнти', query: 'SELECT id, name, phone, "visitsCount", "totalSpent", "salonId" FROM "Client" ORDER BY "visitsCount" DESC LIMIT 50', category: 'clients' },
  { name: 'Активні OTP', query: `SELECT id, phone, email, code, type, channel, verified, attempts, "expiresAt" FROM "OtpCode" WHERE "expiresAt" > NOW() AND verified = false`, category: 'system' },
  { name: 'Мастера', query: 'SELECT m.id, m.name, m.email, m."isActive", m.color, s.name as salon FROM "Master" m JOIN "Salon" s ON m."salonId" = s.id ORDER BY s.name, m.name', category: 'salons' },
  { name: 'Підписки', query: 'SELECT sub.id, sub.plan, sub.status, sub."startDate", s.name as salon FROM "Subscription" sub JOIN "Salon" s ON sub."salonId" = s.id', category: 'finance' },
  { name: 'Розмір таблиць', query: `SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC`, category: 'system' },
  { name: 'Відгуки', query: 'SELECT r.id, r."authorName", r.rating, r.text, r."isVisible", s.name as salon FROM "Review" r JOIN "Salon" s ON r."salonId" = s.id ORDER BY r."createdAt" DESC LIMIT 50', category: 'salons' },
  { name: 'Аудит-лог (останні 50)', query: 'SELECT id, "salonId", "actorType", "actorName", action, "entityType", "createdAt" FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 50', category: 'system' },
];

// GET - return presets
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ presets: PRESETS });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - execute read-only query
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Security: only SELECT/WITH/EXPLAIN allowed
    const upperQuery = query.trim().toUpperCase();
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH') && !upperQuery.startsWith('EXPLAIN')) {
      return NextResponse.json({ error: 'Дозволено тільки SELECT / WITH / EXPLAIN запити' }, { status: 403 });
    }

    // Check for forbidden keywords (outside quoted strings)
    const stripped = query.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
    for (const kw of FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(stripped)) {
        return NextResponse.json({ error: `Заборонено: ${kw}` }, { status: 403 });
      }
    }

    // Auto-limit
    const limitedQuery = /\bLIMIT\b/i.test(query) ? query : `${query} LIMIT 500`;

    const start = Date.now();
    const result = await prisma.$queryRawUnsafe(limitedQuery);
    const executionTime = Date.now() - start;

    const rows = Array.isArray(result) ? result : [];

    // Serialize BigInt
    const serialized = rows.map((row: Record<string, unknown>) => {
      const obj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(row)) {
        obj[key] = typeof val === 'bigint' ? Number(val) : val;
      }
      return obj;
    });

    return NextResponse.json({
      data: serialized,
      rowCount: serialized.length,
      executionTime,
      query: limitedQuery,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Query error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
