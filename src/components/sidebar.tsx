'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Calendar,
  Users,
  UserCircle,
  ShoppingBag,
  BookOpen,
  BarChart3,
  Megaphone,
  Settings,
  Grid3X3,
  HelpCircle,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Головна' },
  { href: '/calendar', icon: Calendar, label: 'Календар' },
  { href: '/sales', icon: ShoppingBag, label: 'Продажі' },
  { href: '/clients', icon: Users, label: 'Клієнти' },
  { href: '/catalogue', icon: BookOpen, label: 'Каталог' },
  { href: '/team', icon: UserCircle, label: 'Команда' },
  { href: '/marketing', icon: Megaphone, label: 'Маркетинг' },
  { href: '/reports', icon: BarChart3, label: 'Звіти' },
  { href: '/addons', icon: Grid3X3, label: 'Доповнення' },
  { href: '/setup', icon: Settings, label: 'Налаштування' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-16 lg:w-64 border-r bg-background flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b">
        <span className="text-xl font-bold text-primary hidden lg:block">BookingPro</span>
        <span className="text-xl font-bold text-primary lg:hidden">B</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 lg:p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                'hover:bg-muted',
                isActive && 'bg-primary/10 text-primary'
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Help */}
      <div className="p-2 lg:p-4 border-t">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
          <span className="hidden lg:block">Допомога</span>
        </Link>
      </div>
    </aside>
  );
}
