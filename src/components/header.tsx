'use client';

import { Button } from '@/components/ui/button';
import { 
  Bell, 
  Wallet, 
  Menu,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const today = new Date();
  const dayNames = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const monthNames = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];
  
  const dayName = dayNames[today.getDay()];
  const day = today.getDate();
  const month = monthNames[today.getMonth()];

  return (
    <header className="h-14 lg:h-16 border-b bg-background flex items-center px-4 lg:px-6">
      {/* Mobile layout */}
      <div className="flex lg:hidden items-center justify-between w-full">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {dayName}, {day} {month}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex items-center justify-between w-full">
        {/* Setup banner */}
        <Button variant="outline" size="sm" className="bg-primary/10 border-primary/20 text-primary">
          <span className="mr-2">🎯</span>
          Продовжити налаштування
        </Button>

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
      </div>
    </header>
  );
}
