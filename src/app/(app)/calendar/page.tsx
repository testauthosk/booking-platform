'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Settings, Users } from 'lucide-react';

export default function CalendarPage() {
  const [currentDate] = useState(new Date());
  
  const hours = Array.from({ length: 24 }, (_, i) => 
    `${i.toString().padStart(2, '0')}:00`
  );

  return (
    <div className="flex flex-col h-full">
      {/* Верхня панель */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">Сьогодні</Button>
          <div className="flex items-center">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium">
              {currentDate.toLocaleDateString('uk-UA', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
              })}
            </span>
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

      {/* Календарна сітка */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[600px]">
          {hours.map((hour) => (
            <div key={hour} className="flex border-b h-16">
              <div className="w-16 p-2 text-sm text-muted-foreground border-r">
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
