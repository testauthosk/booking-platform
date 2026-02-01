'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Tag,
  Plus,
  Smile,
  LayoutGrid,
} from 'lucide-react';

const navItems = [
  { href: '/calendar', icon: Calendar },
  { href: '/catalogue', icon: Tag },
  { href: '/sales', icon: Plus, isMain: true },
  { href: '/clients', icon: Smile },
  { href: '/dashboard', icon: LayoutGrid },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          if (item.isMain) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-center w-14 h-14 -mt-4 rounded-full bg-primary text-primary-foreground shadow-lg"
              >
                <item.icon className="h-6 w-6" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-16 h-full transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-6 w-6" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
