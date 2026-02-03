import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Database check
    let dbStatus = 'ok';
    let dbLatency = 0;
    let dbVersion = '-';
    try {
      const start = Date.now();
      const result: any = await prisma.$queryRaw`SELECT version()`;
      dbLatency = Date.now() - start;
      dbVersion = result[0]?.version?.split(' ')[1] || '-';
    } catch {
      dbStatus = 'error';
    }

    // Telegram check
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
    let telegramStatus = 'not_configured';
    let webhookUrl = null;

    if (telegramToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${telegramToken}/getWebhookInfo`);
        const data = await res.json();
        if (data.ok) {
          telegramStatus = 'ok';
          webhookUrl = data.result.url || null;
        }
      } catch {
        telegramStatus = 'error';
      }
    }

    // Environment variables to check
    const envVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'TELEGRAM_BOT_TOKEN',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CRON_SECRET',
    ];

    const envStatus = envVars.map(name => ({
      name,
      set: !!process.env[name],
    }));

    // Memory usage
    const memory = process.memoryUsage();

    return NextResponse.json({
      database: {
        status: dbStatus,
        latency: dbLatency,
        version: dbVersion,
      },
      telegram: {
        status: telegramStatus,
        webhookUrl,
      },
      vercel: {
        region: process.env.VERCEL_REGION || 'local',
        runtime: `Node ${process.version}`,
      },
      env: envStatus,
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
      },
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
  }
}
