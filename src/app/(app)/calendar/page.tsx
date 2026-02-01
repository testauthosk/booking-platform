'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  SlidersHorizontal, 
  Bell,
  ChevronDown,
  Plus,
  CalendarX2,
  Users,
} from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { cn } from '@/lib/utils';

export default function CalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { open: openSidebar } = useSidebar();
  
  const hours = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );

  // Date navigation
  const goToPrevDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const goToNextDay = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formattedDate = currentDate.toLocaleDateString('uk-UA', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  const isToday = currentDate.toDateString() === new Date().toDateString();

  // For demo - show empty state
  const hasBookings = false;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 transition-transform active:scale-95" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Date navigation */}
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 transition-transform active:scale-95"
            onClick={goToPrevDay}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button className="flex items-center gap-1 hover:bg-muted px-2 py-1 rounded-lg transition-colors">
            <span className="text-sm font-medium">{formattedDate}</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 transition-transform active:scale-95"
            onClick={goToNextDay}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 transition-transform active:scale-95">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 relative transition-transform active:scale-95">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium relative">
            D
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-background" />
          </div>
        </div>
      </header>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button 
            variant={isToday ? "secondary" : "outline"} 
            size="sm"
            onClick={goToToday}
          >
            Сьогодні
          </Button>
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={goToPrevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <button className="flex items-center gap-1 hover:bg-muted px-3 py-1.5 rounded-lg transition-colors">
              <span className="font-medium">{formattedDate}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={goToNextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/team">
              <Users className="h-4 w-4 mr-2" />
              Команда
            </Link>
          </Button>
          <Button variant="outline" size="sm">День</Button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto relative">
        {hasBookings ? (
          <div className="min-w-full">
            {hours.map((hour) => (
              <div key={hour} className="flex border-b h-16">
                <div className="w-14 lg:w-16 p-2 text-xs lg:text-sm text-muted-foreground border-r shrink-0">
                  {hour}
                </div>
                <div className="flex-1 relative hover:bg-muted/50 cursor-pointer transition-colors" />
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <CalendarX2 className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Немає записів у розкладі
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-[280px] mb-6">
              Додайте вільні дати в команду, керуючи запланованими змінами
            </p>
            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <Button variant="outline" className="w-full rounded-full" asChild>
                <Link href="/team">Графік змін</Link>
              </Button>
              <Button variant="outline" className="w-full rounded-full" asChild>
                <Link href="/team">Переглянути всіх співробітників</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Floating Action Button - go to team */}
        <Link 
          href="/team"
          className={cn(
            "fixed right-4 z-30 w-12 h-12 rounded-full bg-muted shadow-lg",
            "flex items-center justify-center",
            "transition-all duration-200 hover:scale-105 active:scale-95",
            "bottom-24 lg:bottom-6"
          )}
        >
          <Users className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}
