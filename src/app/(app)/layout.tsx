'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { SidebarProvider, useSidebar } from '@/components/sidebar-context';
import { CalendarSettingsProvider } from '@/lib/calendar-settings-context';
import { cn } from '@/lib/utils';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="h-screen flex bg-background overflow-hidden overscroll-none">
      {/* Mobile overlay - slides from right to meet sidebar */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden",
          "transition-transform duration-[600ms] ease-out will-change-transform",
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        )}
        onClick={close}
      />
      
      {/* Desktop sidebar only */}
      <div className="hidden lg:block">
        <Sidebar isOpen={true} onClose={() => {}} />
      </div>

      {/* Mobile sidebar drawer */}
      <div className="lg:hidden">
        <Sidebar isOpen={isOpen} onClose={close} />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop header only */}
        <div className="hidden lg:block sticky top-0 z-30">
          <Header />
        </div>
        
        {/* Main content with bottom padding for mobile nav */}
        <main className="flex-1 overflow-auto overscroll-none pb-20 lg:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileNav />
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <CalendarSettingsProvider>
        <AppLayoutInner>{children}</AppLayoutInner>
      </CalendarSettingsProvider>
    </SidebarProvider>
  );
}
