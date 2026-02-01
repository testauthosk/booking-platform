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
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [dayStart, dayEnd, slotDuration]);

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
    const startSlot = (startHour - dayStart) * (60 / slotDuration) + Math.floor(startMin / slotDuration);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const slotCount = Math.ceil(durationMinutes / slotDuration);
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
    end.setMinutes(end.getMinutes() + slotDuration);
    onSlotClick({ start, end, resourceId });
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  // Высота слота зависит от длительности: 10мин = 15px, 30мин = 40px
  const slotHeight = slotDuration <= 10 ? 15 : slotDuration <= 15 ? 20 : 40;
  const headerHeight = 48;
  
  // Позиция индикатора времени в пикселях (только если сегодня)
  const currentTimeTop = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / slotDuration * slotHeight
    : null;

  const timeColWidth = 50;

  return (
    <div className="h-full bg-background overflow-auto">
      {/* Единая таблица */}
      <div 
        className="grid relative"
        style={{ 
          gridTemplateColumns: `${timeColWidth}px repeat(${resources.length}, minmax(100px, 1fr))`,
          minWidth: `${timeColWidth + resources.length * 100}px`,
        }}
      >
        {/* HEADER ROW - sticky */}
        <div 
          className="sticky top-0 z-30 bg-background border-b border-border"
          style={{ gridColumn: '1 / -1', display: 'contents' }}
        >
          {/* Пустая ячейка */}
          <div className="sticky top-0 z-30 bg-muted/50 border-b border-r border-border" style={{ height: headerHeight }} />
          
          {/* Мастера */}
          {resources.map((resource) => (
            <div
              key={`header-${resource.id}`}
              className="sticky top-0 z-30 bg-background border-b border-r border-border last:border-r-0 flex items-center justify-center px-2 font-medium text-sm"
              style={{ height: headerHeight, color: resource.color }}
            >
              <span className="truncate">{resource.title}</span>
            </div>
          ))}
        </div>

        {/* TIME SLOTS */}
        {timeSlots.map((time, rowIdx) => {
          const isFullHour = time.endsWith(':00');
          const isHalfHour = time.endsWith(':30');
          const showTime = isFullHour || isHalfHour;
          
          return (
            <>
              {/* Время */}
              <div
                key={`time-${time}`}
                className={`border-r border-b border-border flex items-start justify-end pr-1 bg-muted/30 sticky left-0 z-20 ${
                  isFullHour ? 'text-xs font-medium text-foreground pt-0.5' : 
                  isHalfHour ? 'text-[10px] text-muted-foreground pt-0.5' : ''
                }`}
                style={{ 
                  height: slotHeight,
                  borderBottomStyle: isFullHour ? 'solid' : 'dashed',
                  borderBottomWidth: isFullHour ? '1px' : '1px',
                  borderBottomColor: isFullHour ? 'hsl(var(--border))' : 'hsl(var(--border) / 0.3)',
                }}
              >
                {showTime ? time : ''}
              </div>

              {/* Ячейки ресурсов */}
              {resources.map((resource) => (
                <div
                  key={`cell-${time}-${resource.id}`}
                  className="border-r border-b border-border last:border-r-0 hover:bg-muted/20 cursor-pointer transition-colors"
                  style={{
                    height: slotHeight,
                    borderBottomStyle: isFullHour ? 'solid' : 'dashed',
                    borderBottomColor: isFullHour ? 'hsl(var(--border))' : 'hsl(var(--border) / 0.3)',
                  }}
                  onClick={() => handleSlotClick(time, resource.id)}
                />
              ))}
            </>
          );
        })}

        {/* СОБЫТИЯ - абсолютное позиционирование поверх grid */}
        <div 
          className="absolute pointer-events-none"
          style={{
            top: headerHeight,
            left: timeColWidth,
            right: 0,
            bottom: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${resources.length}, minmax(100px, 1fr))`,
          }}
        >
          {resources.map((resource) => (
            <div key={`events-${resource.id}`} className="relative">
              {getEventsForResource(resource.id).map((event) => {
                const { startSlot, slotCount } = getEventPosition(event);
                const top = startSlot * slotHeight;
                const height = slotCount * slotHeight - 2;

                return (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1 rounded overflow-hidden cursor-pointer pointer-events-auto shadow-sm hover:shadow-md transition-shadow"
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
                    <div className="p-1 text-white text-xs h-full overflow-hidden">
                      <div className="font-medium truncate">{event.clientName}</div>
                      <div className="opacity-80 truncate">{event.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Индикатор времени */}
        {currentTimeTop !== null && (
          <>
            <div 
              className="absolute left-0 z-40 bg-red-500 text-white text-[10px] px-1 rounded-r font-medium"
              style={{ top: headerHeight + currentTimeTop - 8 }}
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
