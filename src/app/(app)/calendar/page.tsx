'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings, Users, Menu, SlidersHorizontal } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';

export default function CalendarPage() {
  const [currentDate] = useState(new Date());
  const { open: openSidebar } = useSidebar();
  
  const hours = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );

  const formattedDate = currentDate.toLocaleDateString('uk-UA', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  });

  return (
    <div className="flex flex-col h-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={openSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">{formattedDate}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Сьогодні</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium">{formattedDate}</span>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Команда
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm">День</Button>
        </div>
      </div>

      {/* Subheader for mobile - quick filters */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 border-b overflow-x-auto">
        <Button variant="outline" size="sm" className="shrink-0">Сьогодні</Button>
        <Button variant="outline" size="sm" className="shrink-0">
          <Users className="h-4 w-4 mr-1" />
          Команда
        </Button>
        <Button variant="outline" size="sm" className="shrink-0">День</Button>
      </div>

      {/* Календарна сітка */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-full">
          {hours.map((hour) => (
            <div key={hour} className="flex border-b h-16">
              <div className="w-14 lg:w-16 p-2 text-xs lg:text-sm text-muted-foreground border-r shrink-0">
                {hour}
              </div>
              <div className="flex-1 relative hover:bg-muted/50 cursor-pointer" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
