'use client';

import { Button } from '@/components/ui/button';
import { 
  Search, 
  Bell, 
  Wallet, 
  ChartBar,
  Menu
} from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b bg-background flex items-center justify-between px-4 lg:px-6">
      {/* Mobile menu */}
      <Button 
        variant="ghost" 
        size="icon" 
        className="lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Setup banner - desktop only */}
      <div className="hidden lg:flex">
        <Button variant="outline" size="sm" className="bg-primary/10 border-primary/20 text-primary">
          <span className="mr-2">🎯</span>
          Продовжити налаштування
        </Button>
      </div>

      {/* Mobile: centered title placeholder */}
      <div className="lg:hidden flex-1 text-center">
        <span className="font-semibold text-foreground">Календар</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 lg:gap-2">
        <Button variant="ghost" size="icon" className="hidden lg:flex">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden lg:flex">
          <ChartBar className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </Button>
        <Button variant="ghost" size="icon" className="relative hidden sm:flex">
          <Wallet className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            1
          </span>
        </Button>
        <div className="h-9 w-9 rounded-full bg-orange-500 flex items-center justify-center text-white font-medium ml-1 lg:ml-2">
          D
        </div>
      </div>
    </header>
  );
}
