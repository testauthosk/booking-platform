'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Tag,
  Smile,
  LayoutGrid,
  Package,
} from 'lucide-react';

const navItems = [
  { href: '/calendar', icon: Calendar },
  { href: '/catalogue', icon: Tag },
  { href: '/inventory', icon: Package, isMain: true },
  { href: '/clients', icon: Smile },
  { href: '/dashboard', icon: LayoutGrid },
];

export function MobileNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null);

  const activeIdx = navItems.findIndex(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  // Вимірюємо позицію активної кнопки для плаваючого індикатора
  useEffect(() => {
    if (!navRef.current || activeIdx < 0) return;
    
    const updateIndicator = () => {
      const nav = navRef.current;
      if (!nav) return;
      const buttons = nav.children;
      if (activeIdx >= 0 && activeIdx < buttons.length) {
        const btn = buttons[activeIdx] as HTMLElement;
        setIndicatorStyle({
          left: btn.offsetLeft,
          width: btn.offsetWidth,
        });
      }
    };

    updateIndicator();
    // Перерахувати при resize
    const ro = new ResizeObserver(updateIndicator);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeIdx]);

  return (
    <nav className="lg:hidden fixed bottom-1 left-[23px] right-[23px] z-50 bg-background rounded-b-2xl border border-black border-t-0">
      <div ref={navRef} className="relative flex items-center justify-around h-16 px-2">
        {/* Плаваючий індикатор */}
        {indicatorStyle && activeIdx >= 0 && !navItems[activeIdx]?.isMain && (
          <div
            className="absolute top-2 bottom-2 rounded-2xl border-2 border-foreground/20 bg-foreground/5 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] pointer-events-none z-0"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
            }}
          />
        )}

        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          if (item.isMain) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative z-10 flex items-center justify-center w-12 h-12 rounded-2xl",
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
                'relative z-10 flex flex-col items-center justify-center w-16 h-full',
                'transition-all duration-200 active:scale-95',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-transform duration-200",
                isActive && "scale-110"
              )} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
