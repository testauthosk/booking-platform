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
  slotDuration = 30,
}: CustomCalendarProps) {
  // Генерируем слоты - каждые 30 мин
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
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
    
    const startSlot = (startHour - dayStart) * 2 + (startMin >= 30 ? 1 : 0);
    const endSlot = (endHour - dayStart) * 2 + (endMin > 30 ? 2 : endMin > 0 ? 1 : 0);
    const slotCount = Math.max(1, endSlot - startSlot);
    
    return { startSlot, slotCount };
  };

  const getEventsForResource = (resourceId: string) => {
    return events.filter(e => e.resourceId === resourceId);
  };

  const handleSlotClick = (time: string, resourceId: string) => {
    if (!onSlotClick) return;
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(currentDateStr);
    start.setHours(hours, minutes, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    onSlotClick({ start, end, resourceId });
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  const slotHeight = 32;
  const headerHeight = 48;
  const timeColWidth = 52;
  
  // Текущее время - позиция в пикселях
  const currentTimeTop = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / 30 * slotHeight
    : null;

  return (
    <div className="h-full bg-background overflow-auto">
      <div 
        className="grid relative"
        style={{ 
          gridTemplateColumns: `${timeColWidth}px repeat(${resources.length}, minmax(90px, 1fr))`,
          minWidth: `${timeColWidth + resources.length * 90}px`,
        }}
      >
        {/* HEADER ROW */}
        <div 
          className="sticky top-0 z-30 bg-background border-b border-border"
          style={{ height: headerHeight }}
        />
        {resources.map((resource) => (
          <div
            key={`header-${resource.id}`}
            className="sticky top-0 z-30 bg-background border-b border-l border-border flex items-center justify-center px-2"
            style={{ height: headerHeight }}
          >
            <span className="text-sm font-medium truncate" style={{ color: resource.color }}>
              {resource.title}
            </span>
          </div>
        ))}

        {/* TIME SLOTS */}
        {timeSlots.map((time, rowIdx) => {
          const isFullHour = time.endsWith(':00');
          const isFirstRow = rowIdx === 0;
          
          return (
            <>
              {/* Time label */}
              <div
                key={`time-${time}`}
                className="sticky left-0 z-20 bg-background flex items-start justify-end pr-2"
                style={{ 
                  height: slotHeight,
                  paddingTop: isFirstRow && isFullHour ? 4 : 0,
                  borderTop: isFullHour && !isFirstRow ? '1px solid hsl(var(--border) / 0.6)' : 'none',
                }}
              >
                {isFullHour && (
                  <span className={`text-[11px] text-muted-foreground ${isFirstRow ? '' : '-mt-2'}`}>{time}</span>
                )}
              </div>

              {/* Resource cells */}
              {resources.map((resource) => (
                <div
                  key={`cell-${time}-${resource.id}`}
                  className="border-l border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  style={{
                    height: slotHeight,
                    borderTop: isFullHour ? '1px solid hsl(var(--border) / 0.6)' : '1px solid hsl(var(--border) / 0.2)',
                  }}
                  onClick={() => handleSlotClick(time, resource.id)}
                />
              ))}
            </>
          );
        })}

        {/* EVENTS OVERLAY */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: headerHeight,
            left: timeColWidth,
            right: 0,
            bottom: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${resources.length}, minmax(90px, 1fr))`,
          }}
        >
          {resources.map((resource) => (
            <div key={`events-${resource.id}`} className="relative border-l border-border">
              {getEventsForResource(resource.id).map((event) => {
                const { startSlot, slotCount } = getEventPosition(event);
                const top = startSlot * slotHeight;
                const height = slotCount * slotHeight - 2;

                return (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1 rounded-md overflow-hidden cursor-pointer pointer-events-auto shadow-sm hover:shadow-md transition-shadow"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      backgroundColor: event.backgroundColor || '#4eb8d5',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    <div className="p-1.5 text-white text-xs h-full overflow-hidden">
                      <div className="font-medium truncate">{event.clientName}</div>
                      <div className="opacity-80 truncate text-[11px]">{event.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        {currentTimeTop !== null && (
          <>
            <div 
              className="absolute z-40 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-r font-medium"
              style={{ 
                top: headerHeight + currentTimeTop - 8,
                left: 0,
              }}
            >
              {`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`}
            </div>
            <div 
              className="absolute h-0.5 bg-red-500 z-30"
              style={{ 
                top: headerHeight + currentTimeTop,
                left: timeColWidth,
                right: 0,
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
