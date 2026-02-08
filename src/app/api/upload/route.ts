import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { verifyStaffToken } from '@/lib/staff-auth';

// Конфигурація Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dyy8isfr0',
  api_key: process.env.CLOUDINARY_API_KEY || '497364172988845',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'vWz6KERJLA7CsycgN5iPKxlOpkU',
});

export async function POST(request: NextRequest) {
  try {
    // Auth: NextAuth (owner) або JWT (staff)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      const staffAuth = await verifyStaffToken(request);
      if (staffAuth instanceof NextResponse) return staffAuth;
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
