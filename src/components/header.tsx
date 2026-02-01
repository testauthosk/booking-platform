'use client';

import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Wallet, 
} from 'lucide-react';

export function Header() {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-6">
      {/* Spacer */}
      <div />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Wallet className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            1
          </span>
        </Button>
        <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium ml-2">
          D
        </div>
      </div>
    </header>
  );
}
