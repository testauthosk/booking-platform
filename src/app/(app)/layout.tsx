'use client';

import { useEffect } from 'react';
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
  // No exit animation — only enter

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
      <div className="hidden lg:flex lg:flex-col lg:h-full">
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
        <main className={`flex-1 overflow-auto overscroll-none lg:pb-0 ${isCalendar ? '' : 'pb-[68px]'}`}>
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

      {/* No exit animation for calendar header elements */}
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const salonId = user?.salonId || '';

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
