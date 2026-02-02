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
  X,
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

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed lg:static inset-y-0 left-0 z-50',
        'w-72 lg:w-64 border-r bg-background flex flex-col',
        'transition-transform duration-[480ms] ease-out will-change-transform',
        // Mobile: hidden by default, shown when isOpen
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Logo + Close button */}
      <div className="h-16 flex items-center justify-between px-6 border-b">
        <span className="text-xl font-bold text-primary">BookingPro</span>
        <button
          onClick={onClose}
          className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-all active:scale-95"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item, index) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                'transition-all duration-200 active:scale-[0.98]',
                'hover:bg-muted',
                isActive && 'bg-primary/10 text-primary font-medium'
              )}
              style={{
                animationDelay: isOpen ? `${index * 30}ms` : '0ms',
              }}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Help */}
      <div className="p-4 border-t pb-24 lg:pb-4">
        <Link
          href="/help"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-all duration-200 active:scale-[0.98]"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Допомога</span>
        </Link>
      </div>
    </aside>
  );
}
