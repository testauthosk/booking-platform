'use client';

import { useMemo } from 'react';

export interface BookingEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  backgroundColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  masterName?: string;
  status?: string;
}

export interface Resource {
  id: string;
  title: string;
  color?: string;
}

interface CustomCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  selectedDate?: Date;
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  dayStart?: number;
  dayEnd?: number;
  slotDuration?: number;
}

export function CustomCalendar({
  events = [],
  resources = [],
  selectedDate,
  onEventClick,
  onSlotClick,
  dayStart = 8,
  dayEnd = 21,
  slotDuration = 15,
}: CustomCalendarProps) {
  // Генерируем слоты только для отображения линий (каждые 30 мин визуально)
  const hourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      slots.push(hour);
    }
    return slots;
  }, [dayStart, dayEnd]);

  const today = new Date();
  const currentDate = selectedDate || today;
  const currentDateStr = currentDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const isToday = currentDateStr === todayStr;

  const getEventPosition = (event: BookingEvent) => {
    const startHour = event.start.getHours();
    const startMin = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMin = event.end.getMinutes();
    
    // Позиция в процентах от начала дня
    const totalMinutes = (dayEnd - dayStart) * 60;
    const startMinFromDayStart = (startHour - dayStart) * 60 + startMin;
    const endMinFromDayStart = (endHour - dayStart) * 60 + endMin;
    
    const topPercent = (startMinFromDayStart / totalMinutes) * 100;
    const heightPercent = ((endMinFromDayStart - startMinFromDayStart) / totalMinutes) * 100;
    
    return { topPercent, heightPercent };
  };

  const getEventsForResource = (resourceId: string) => {
    return events.filter(e => e.resourceId === resourceId);
  };

  const handleSlotClick = (hour: number, minutes: number, resourceId: string) => {
    if (!onSlotClick) return;
    const start = new Date(currentDateStr);
    start.setHours(hour, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    onSlotClick({ start, end, resourceId });
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  // Позиция индикатора в процентах
  const totalMinutes = (dayEnd - dayStart) * 60;
  const currentMinFromStart = (currentHour - dayStart) * 60 + currentMin;
  const currentTimePercent = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? (currentMinFromStart / totalMinutes) * 100
    : null;

  const timeColWidth = 48;
  const hourHeight = 60; // px на час

  return (
    <div className="h-full bg-background overflow-auto">
      <div 
        className="grid relative"
        style={{ 
          gridTemplateColumns: `${timeColWidth}px repeat(${resources.length}, minmax(80px, 1fr))`,
          minWidth: `${timeColWidth + resources.length * 80}px`,
        }}
      >
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50" style={{ height: 52 }} />
        {resources.map((resource) => (
          <div
            key={`header-${resource.id}`}
            className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-center px-2"
            style={{ height: 52 }}
          >
            <span 
              className="text-sm font-medium truncate"
              style={{ color: resource.color }}
            >
              {resource.title}
            </span>
          </div>
        ))}

        {/* TIME COLUMN */}
        <div 
          className="sticky left-0 z-20 bg-background/80"
          style={{ gridRow: `2 / span ${hourSlots.length}` }}
        >
          {hourSlots.map((hour) => (
            <div
              key={`time-${hour}`}
              className="flex items-start justify-end pr-2 pt-0"
              style={{ height: hourHeight }}
            >
              <span className="text-[11px] text-muted-foreground/70 font-medium -mt-2">
                {`${hour.toString().padStart(2, '0')}:00`}
              </span>
            </div>
          ))}
        </div>

        {/* RESOURCE COLUMNS */}
        {resources.map((resource, colIdx) => (
          <div 
            key={`col-${resource.id}`} 
            className="relative"
            style={{ gridRow: `2 / span ${hourSlots.length}` }}
          >
            {/* Hour grid lines */}
            {hourSlots.map((hour, idx) => (
              <div
                key={`cell-${hour}-${resource.id}`}
                className="border-l border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                style={{ 
                  height: hourHeight,
                  borderTop: idx === 0 ? 'none' : '1px solid hsl(var(--border) / 0.2)',
                }}
                onClick={() => handleSlotClick(hour, 0, resource.id)}
              >
                {/* Half-hour line */}
                <div 
                  className="absolute w-full border-t border-dashed border-border/15"
                  style={{ top: hourHeight / 2 }}
                />
              </div>
            ))}

            {/* Events */}
            {getEventsForResource(resource.id).map((event) => {
              const { topPercent, heightPercent } = getEventPosition(event);
              // Мягкие пастельные цвета
              const bgColor = event.backgroundColor || '#4eb8d5';
              
              return (
                <div
                  key={event.id}
                  className="absolute left-1 right-1 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:z-10"
                  style={{
                    top: `${topPercent}%`,
                    height: `${heightPercent}%`,
                    minHeight: 24,
                    backgroundColor: bgColor,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                >
                  <div className="p-1.5 text-white h-full overflow-hidden">
                    <div className="text-[11px] font-semibold truncate leading-tight">
                      {event.clientName}
                    </div>
                    <div className="text-[10px] opacity-80 truncate leading-tight">
                      {event.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Current time indicator */}
        {currentTimePercent !== null && (
          <div 
            className="absolute z-40 flex items-center pointer-events-none"
            style={{ 
              top: `calc(52px + ${currentTimePercent}%)`,
              left: 0,
              right: 0,
            }}
          >
            <div className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-r-md font-medium shadow-sm">
              {`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`}
            </div>
            <div className="flex-1 h-[2px] bg-red-500 shadow-sm" style={{ marginLeft: timeColWidth - 36 }} />
          </div>
        )}
      </div>
    </div>
  );
}
