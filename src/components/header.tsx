'use client';

import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSession } from 'next-auth/react';

function getInitial(name?: string | null): string {
  return name?.charAt(0)?.toUpperCase() || '?';
}

export function Header() {
  const { data: session } = useSession();
  const initial = getInitial(session?.user?.name);

  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      {/* Spacer */}
      <div />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-medium ml-2">
          {initial}
        </div>
      </div>
    </header>
  );
}
