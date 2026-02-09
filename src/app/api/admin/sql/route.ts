import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { prisma } from '@/lib/prisma';

// Forbidden SQL keywords - these can modify data
const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'UPDATE',
  'DELETE',
  'DROP',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'GRANT',
  'REVOKE',
  'REPLACE',
  'MERGE',
  'UPSERT',
  'EXEC',
  'EXECUTE',
  'CALL',
  'SET ',
  'COMMIT',
  'ROLLBACK',
  'SAVEPOINT',
  'LOCK',
  'UNLOCK',
];

// Preset queries for common operations
const PRESET_QUERIES = {
  all_salons: `SELECT id, name, slug, "isActive", "createdAt", 
               (SELECT COUNT(*) FROM "Booking" WHERE "salonId" = "Salon".id) as bookings_count,
               (SELECT COUNT(*) FROM "Client" WHERE "salonId" = "Salon".id) as clients_count
               FROM "Salon" ORDER BY "createdAt" DESC LIMIT 100`,
  
  top_clients: `SELECT c.id, c.name, c.phone, c."visitsCount", c."totalSpent", 
                s.name as salon_name
                FROM "Client" c 
                JOIN "Salon" s ON c."salonId" = s.id
                ORDER BY c."totalSpent" DESC LIMIT 50`,
  
  today_bookings: `SELECT b.id, b.date, b.time, b."clientName", b."clientPhone", 
                   b."serviceName", b.status, b.price, s.name as salon_name
                   FROM "Booking" b 
                   JOIN "Salon" s ON b."salonId" = s.id
                   WHERE b.date = CURRENT_DATE
                   ORDER BY b.time ASC`,
  
  recent_users: `SELECT id, email, name, role, "createdAt", "telegramChatId" IS NOT NULL as has_telegram
                 FROM "User" ORDER BY "createdAt" DESC LIMIT 50`,
  
  subscriptions: `SELECT sub.id, sub.plan, sub.status, sub."createdAt", 
                  s.name as salon_name, s.slug
                  FROM "Subscription" sub
                  JOIN "Salon" s ON sub."salonId" = s.id
                  ORDER BY sub."createdAt" DESC`,
  
  revenue_by_salon: `SELECT s.name, s.slug, 
                     COUNT(b.id) as total_bookings,
                     SUM(CASE WHEN b.status = 'COMPLETED' THEN b.price ELSE 0 END) as revenue
                     FROM "Salon" s
                     LEFT JOIN "Booking" b ON b."salonId" = s.id
                     GROUP BY s.id, s.name, s.slug
                     ORDER BY revenue DESC NULLS LAST`,
};

// POST - execute read-only SQL
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { query, preset } = await req.json();
    
    let sqlQuery: string;
    
    if (preset && PRESET_QUERIES[preset as keyof typeof PRESET_QUERIES]) {
      sqlQuery = PRESET_QUERIES[preset as keyof typeof PRESET_QUERIES];
    } else if (query) {
      sqlQuery = query.trim();
    } else {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Check for forbidden keywords (case-insensitive)
    const upperQuery = sqlQuery.toUpperCase();
    for (const keyword of FORBIDDEN_KEYWORDS) {
      // Check if keyword appears as a word (not part of another word)
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(upperQuery)) {
        return NextResponse.json(
          { error: `Заборонена операція: ${keyword}. Дозволені тільки SELECT запити.` },
          { status: 400 }
        );
      }
    }

    // Must start with SELECT or WITH (for CTEs)
    if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
      return NextResponse.json(
        { error: 'Дозволені тільки SELECT запити' },
        { status: 400 }
      );
    }

    // Limit results
    if (!upperQuery.includes('LIMIT')) {
      sqlQuery = sqlQuery.replace(/;?\s*$/, '') + ' LIMIT 1000';
    }

    // Execute query
    const startTime = Date.now();
    const result = await prisma.$queryRawUnsafe(sqlQuery);
    const executionTime = Date.now() - startTime;

    // Convert BigInt to string for JSON serialization
    const serializedResult = JSON.parse(
      JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({
      success: true,
      data: serializedResult,
      rowCount: Array.isArray(serializedResult) ? serializedResult.length : 0,
      executionTime,
      query: sqlQuery,
    });
  } catch (error: unknown) {
    console.error('SQL execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `SQL помилка: ${errorMessage}` },
      { status: 400 }
    );
  }
}

// GET - get preset queries
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      presets: Object.entries(PRESET_QUERIES).map(([key, query]) => ({
        key,
        name: key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        query,
      })),
    });
  } catch (error) {
    console.error('Error getting presets:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
