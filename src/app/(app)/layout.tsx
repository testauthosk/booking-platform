'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { SidebarProvider, useSidebar } from '@/components/sidebar-context';
import { CalendarSettingsProvider } from '@/lib/calendar-settings-context';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't render if not authenticated
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden overscroll-none">
      {/* Mobile overlay - frosted glass fade */}
      <div
        className={cn(
          "fixed inset-0 bg-white/20 backdrop-blur-sm z-40 lg:hidden",
          "transition-opacity duration-[480ms] ease-out",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
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
        <main className="flex-1 overflow-auto overscroll-none pb-[100px] lg:pb-0 bg-gray-50">
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
  const { user } = useAuth();
  const salonId = user?.salonId || 'demo-salon-id';

  return (
    <SidebarProvider>
      <CalendarSettingsProvider salonId={salonId}>
        <AppLayoutInner>{children}</AppLayoutInner>
      </CalendarSettingsProvider>
    </SidebarProvider>
  );
}
