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
  { href: '/calendar', icon: Calendar, label: 'Календар' },
  { href: '/catalogue', icon: Tag, label: 'Каталог' },
  { href: '/inventory', icon: Package, label: 'Склад' },
  { href: '/clients', icon: Smile, label: 'Клієнти' },
  { href: '/dashboard', icon: LayoutGrid, label: 'Головна' },
];

interface MobileNavProps {
  isCalendar?: boolean;
}

export function MobileNav({ isCalendar = false }: MobileNavProps) {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [animReady, setAnimReady] = useState(false);

  const activeIdx = navItems.findIndex(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  );

  useEffect(() => {
    if (!navRef.current || activeIdx < 0) return;

    const update = () => {
      const nav = navRef.current;
      if (!nav) return;
      const links = nav.querySelectorAll('a');
      const btn = links[activeIdx] as HTMLElement;
      if (btn) {
        const size = 50;
        setIndicator({
          left: btn.offsetLeft + btn.offsetWidth / 2 - size / 2,
          width: size,
        });
        requestAnimationFrame(() => setAnimReady(true));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeIdx]);

  return (
    <nav
      className={cn(
        "lg:hidden fixed bottom-1 left-[23px] right-[23px] z-40 bg-background border border-black",
        "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        isCalendar
          ? "rounded-b-2xl rounded-t-none border-t-0"
          : "rounded-2xl border-t"
      )}
    >
      <div ref={navRef} className="relative flex items-center justify-around h-16 px-2">
        {/* Чорний плаваючий індикатор */}
        {indicator && activeIdx >= 0 && (
          <div
            className={cn(
              "absolute rounded-2xl bg-foreground pointer-events-none z-0",
              animReady && "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            )}
            style={{
              left: indicator.left,
              width: indicator.width,
              height: '50px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        )}

        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative z-10 flex flex-col items-center justify-center w-16 h-full gap-0.5',
                'transition-all duration-200 active:scale-95'
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors duration-300",
                isActive ? "text-background" : "text-muted-foreground"
              )} />
              <span className={cn(
                "text-[9px] font-medium leading-none transition-colors duration-300",
                isActive ? "text-background" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
