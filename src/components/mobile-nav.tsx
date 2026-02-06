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
  { href: '/inventory', icon: Package },
  { href: '/clients', icon: Smile },
  { href: '/dashboard', icon: LayoutGrid },
];

export function MobileNav() {
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
      // Шукаємо тільки <a> елементи, пропускаючи індикатор-div
      const links = nav.querySelectorAll('a');
      const btn = links[activeIdx] as HTMLElement;
      if (btn) {
        const size = 48;
        setIndicator({
          left: btn.offsetLeft + btn.offsetWidth / 2 - size / 2,
          width: size,
        });
        // Дозволяємо анімацію після першого рендеру
        requestAnimationFrame(() => setAnimReady(true));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(navRef.current);
    return () => ro.disconnect();
  }, [activeIdx]);

  return (
    <nav className="lg:hidden fixed bottom-1 left-[23px] right-[23px] z-50 bg-background rounded-b-2xl border border-black border-t-0">
      <div ref={navRef} className="relative flex items-center justify-around h-16 px-2">
        {/* Чорний плаваючий індикатор */}
        {indicator && activeIdx >= 0 && (
          <div
            className={cn(
              "absolute h-12 rounded-2xl bg-foreground pointer-events-none z-0",
              animReady && "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            )}
            style={{
              left: indicator.left,
              width: indicator.width,
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
                'relative z-10 flex items-center justify-center w-16 h-full',
                'transition-all duration-200 active:scale-95'
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 transition-colors duration-300",
                isActive ? "text-background" : "text-muted-foreground"
              )} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
