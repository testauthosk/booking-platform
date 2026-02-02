'use client';

import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';

export function Header() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      {/* Spacer */}
      <div />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <Button variant="ghost" size="icon" className="relative">
          <Wallet className="h-5 w-5" />
        </Button>
        <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium ml-2">
          D
        </div>
      </div>
    </header>
  );
}
