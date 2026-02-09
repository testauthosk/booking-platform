'use client';

import { Card } from '@/components/ui/card';
import {
  Building2,
  Calendar,
  Bell,
  Globe,
  History,
  ChevronRight,
  Shield,
  CreditCard,
  MessageCircle,
  ClipboardList,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

const settingsCategories = [
  {
    icon: Globe,
    label: 'Сайт-візитка',
    description: 'Публічна сторінка салону для клієнтів',
    href: '/setup/website',
  },
  {
    icon: Building2,
    label: 'Бізнес',
    description: 'Назва, адреса, контакти, графік роботи',
    href: '/setup/business',
  },
  {
    icon: ClipboardList,
    label: 'Правила онлайн-запису',
    description: 'Мін. час, крок слотів, підтвердження, скасування',
    href: '/setup/booking-rules',
  },
  {
    icon: Bell,
    label: 'Сповіщення',
    description: 'Канали, нагадування, привітання, повернення',
    href: '/setup/notifications',
  },
  {
    icon: MessageCircle,
    label: 'Telegram-бот',
    description: 'Статус бота, посилання для клієнтів',
    href: '/setup/telegram',
  },
  {
    icon: CreditCard,
    label: 'Підписка',
    description: 'Ваш план, ліміти, апгрейд',
    href: '/setup/subscription',
  },
  {
    icon: Calendar,
    label: 'Планування',
    description: 'Розклад роботи по днях',
    href: '/setup/schedule',
  },
  {
    icon: Lock,
    label: 'Безпека',
    description: 'Пароль, сесії, видалення акаунту',
    href: '/setup/security',
  },
  {
    icon: History,
    label: 'Історія змін',
    description: 'Журнал дій майстрів та адміністраторів',
    href: '/setup/history',
  },
];

export default function SetupPage() {
  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Налаштування</h1>
        <p className="text-muted-foreground text-sm">Керуйте параметрами вашого салону</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {settingsCategories.map((category) => (
          <Link key={category.label} href={category.href}>
            <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors h-full">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <category.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{category.label}</p>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
