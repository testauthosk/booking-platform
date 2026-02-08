import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { verifyStaffToken } from '@/lib/staff-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// Конфигурація Cloudinary — credentials only from env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    // Auth: NextAuth (owner) або JWT (staff)
    let userId = 'unknown';
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const staffAuth = await verifyStaffToken(request);
      if (staffAuth instanceof NextResponse) return staffAuth;
      userId = staffAuth.masterId;
    } else {
      userId = session.user.id;
    }

    // Rate limit: 10 uploads per minute per user
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlCheck = checkRateLimit(`upload:${userId}:${ip}`, { maxAttempts: 10, windowMs: 60_000 });
    if (!rlCheck.allowed) {
      return NextResponse.json(
        { error: `Забагато завантажень. Спробуйте через ${rlCheck.resetIn} сек` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'booking-platform';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Ліміт 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    // Дозволені типи
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Конвертуємо File в base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Завантажуємо в Cloudinary
    const result = await cloudinary.uploader.upload(base64, {
      folder,
      resource_type: 'auto',
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
