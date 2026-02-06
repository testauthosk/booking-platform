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
  Package,
} from 'lucide-react';

const navItems = [
  { href: '/calendar', icon: Calendar },
  { href: '/catalogue', icon: Tag },
  { href: '/inventory', icon: Package, isMain: true },  // Склад замість Продажів
  { href: '/clients', icon: Smile },
  { href: '/dashboard', icon: LayoutGrid },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-[23px] right-[23px] z-50 bg-background rounded-b-2xl border border-black border-t-0">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          if (item.isMain) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-2xl",
                  "bg-foreground text-background shadow-lg",
                  "transition-all duration-200",
                  "hover:scale-105 active:scale-95"
                )}
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
                'flex flex-col items-center justify-center w-16 h-full',
                'transition-all duration-200 active:scale-95',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-transform duration-200",
                isActive && "scale-110"
              )} />
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-foreground mt-1 animate-in fade-in duration-200" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
