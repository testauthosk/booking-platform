import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      logo: true,
      address: true,
      phone: true,
      onboardingCompleted: true,
    },
  });

  if (!salon || !salon.onboardingCompleted) {
    return { title: 'Салон не знайдено' };
  }

  const title = `${salon.name} — Онлайн запис`;
  const description = salon.description
    || `Запишіться онлайн до ${salon.name}. Зручний вибір послуги, майстра та часу.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(salon.logo ? { images: [{ url: salon.logo, width: 400, height: 400 }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
    other: {
      'application-name': salon.name,
    },
  };
}

// JSON-LD structured data for SEO
function SalonJsonLd({ slug }: { slug: string }) {
  // This will be hydrated client-side, but we need server data
  // JSON-LD is injected via the page component instead
  return null;
}

export default function SalonLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
