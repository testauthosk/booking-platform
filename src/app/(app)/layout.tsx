'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { WeekBar } from '@/components/calendar/week-bar';
import { SidebarProvider, useSidebar } from '@/components/sidebar-context';
import { CalendarSettingsProvider } from '@/lib/calendar-settings-context';
import { CalendarDateProvider, useCalendarDate } from '@/lib/calendar-date-context';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { selectedDate, setSelectedDate } = useCalendarDate();

  const isCalendar = pathname === '/calendar' || pathname.startsWith('/calendar/') || pathname === '/calendar-test';
  const wasCalendarRef = useRef(isCalendar);
  const [ghostExit, setGhostExit] = useState(false);

  // Detect leaving calendar → show ghost fade-out
  useEffect(() => {
    if (wasCalendarRef.current && !isCalendar) {
      setGhostExit(true);
      const t = setTimeout(() => setGhostExit(false), 300);
      return () => clearTimeout(t);
    }
    wasCalendarRef.current = isCalendar;
  }, [isCalendar]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden overscroll-none">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-white/20 backdrop-blur-sm z-40 lg:hidden",
          "transition-opacity duration-[480ms] ease-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={close}
      />
      
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Mobile sidebar drawer */}
      <div className="lg:hidden">
        <Sidebar isOpen={isOpen} onClose={close} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop header */}
        <div className="hidden lg:block sticky top-0 z-30">
          <Header />
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-auto overscroll-none lg:pb-0">
          {children}
        </main>
      </div>

      {/* Week Bar — завжди рендериться, анімується показ/приховування */}
      <WeekBar
        selectedDate={selectedDate}
        onDateChange={(date) => {
          setSelectedDate(date);
          if (!isCalendar) {
            router.push('/calendar');
          }
        }}
        visible={isCalendar}
      />

      {/* Mobile bottom navigation */}
      <MobileNav isCalendar={isCalendar} />

      {/* Ghost calendar header elements — fly out when leaving calendar */}
      {ghostExit && (
        <div
          className="lg:hidden fixed z-[100] pointer-events-none flex items-center"
          style={{
            top: 6,
            left: 68, // after burger (12px pad + 44px burger + 8px gap)
            gap: 8,
            animation: 'calHeaderFlyOut 250ms ease-out forwards',
          }}
        >
          {/* Segment ghost */}
          <div
            style={{ height: 44, borderRadius: 12, border: '1px solid rgba(0,0,0,0.4)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', padding: '0 3px', gap: 2 }}
          >
            <div style={{ height: 36, borderRadius: 10, backgroundColor: '#fff', padding: '0 14px', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, color: '#6b7280' }}>День</div>
            <div style={{ height: 36, borderRadius: 10, backgroundColor: '#000', color: '#fff', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>Тиждень</div>
          </div>
          {/* Today ghost */}
          <div
            style={{ height: 44, width: 96, borderRadius: 12, border: '1px solid rgba(0,0,0,0.4)', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}
          >
            Сьогодні
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const salonId = user?.salonId || 'demo-salon-id';

  return (
    <SidebarProvider>
      <CalendarSettingsProvider salonId={salonId}>
        <CalendarDateProvider>
          <AppLayoutInner>{children}</AppLayoutInner>
        </CalendarDateProvider>
      </CalendarSettingsProvider>
    </SidebarProvider>
  );
}
