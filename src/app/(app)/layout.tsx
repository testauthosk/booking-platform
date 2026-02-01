'use client';

import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { MobileNav } from '@/components/mobile-nav';
import { SidebarProvider, useSidebar } from '@/components/sidebar-context';

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="h-screen flex bg-background">
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
        />
      )}
      
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
        <main className="flex-1 overflow-auto bg-muted/30 pb-20 lg:pb-0">
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
      <AppLayoutInner>{children}</AppLayoutInner>
    </SidebarProvider>
  );
}
