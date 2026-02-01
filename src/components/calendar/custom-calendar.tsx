'use client';

import { useMemo } from 'react';
import Image from 'next/image';

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
  avatar?: string;
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
  const headerHeight = 72; // Увеличено для аватарок
  const timeColWidth = 52;
  
  // Форматирование времени
  const formatTime = (date: Date) => 
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  // Текущее время - позиция в пикселях
  const currentTimeTop = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / 30 * slotHeight
    : null;

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-auto">
      <div 
        className="grid relative"
        style={{ 
          gridTemplateColumns: `${timeColWidth}px repeat(${resources.length}, minmax(140px, 1fr))`,
          minWidth: `${timeColWidth + resources.length * 140}px`,
        }}
      >
        {/* HEADER ROW */}
        <div 
          className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-white/50 dark:border-slate-700/50"
          style={{ height: headerHeight }}
        />
        {resources.map((resource) => (
          <div
            key={`header-${resource.id}`}
            className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-l border-white/50 dark:border-slate-700/50 flex flex-col items-center justify-center px-2 py-2 gap-1"
            style={{ height: headerHeight }}
          >
            {/* Аватарка */}
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-lg ring-2 ring-white/50"
              style={{ backgroundColor: resource.color || '#9ca3af' }}
            >
              {resource.avatar ? (
                <Image 
                  src={resource.avatar} 
                  alt={resource.title} 
                  width={40} 
                  height={40} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-semibold">
                  {resource.title.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Имя */}
            <span className="text-xs font-semibold truncate max-w-full text-center leading-tight text-slate-700 dark:text-slate-200">
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
                className={`sticky left-0 z-20 bg-white/50 dark:bg-slate-900/50 flex items-start justify-end pr-2 ${
                  isFullHour && !isFirstRow ? 'border-t border-t-slate-200/80 dark:border-t-slate-700/80' : isFullHour ? '' : 'border-t border-t-slate-200/40 dark:border-t-slate-700/40'
                }`}
                style={{ 
                  height: slotHeight,
                  paddingTop: isFirstRow && isFullHour ? 4 : 0,
                }}
              >
                {isFullHour && (
                  <span className={`text-[11px] text-slate-500 dark:text-slate-400 font-semibold ${isFirstRow ? '' : '-mt-2'}`}>{time}</span>
                )}
              </div>

              {/* Resource cells */}
              {resources.map((resource) => (
                <div
                  key={`cell-${time}-${resource.id}`}
                  className={`border-l border-slate-200/60 dark:border-slate-700/60 hover:bg-white/50 dark:hover:bg-slate-800/50 cursor-pointer transition-all ${
                    isFullHour ? 'border-t border-t-slate-200/80 dark:border-t-slate-700/80' : 'border-t border-t-slate-200/40 dark:border-t-slate-700/40'
                  }`}
                  style={{ height: slotHeight }}
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
            gridTemplateColumns: `repeat(${resources.length}, minmax(140px, 1fr))`,
          }}
        >
          {resources.map((resource) => (
            <div key={`events-${resource.id}`} className="relative border-l border-slate-200/60 dark:border-slate-700/60">
              {getEventsForResource(resource.id).map((event) => {
                const { startSlot, slotCount } = getEventPosition(event);
                const top = startSlot * slotHeight;
                const height = slotCount * slotHeight - 2;

                return (
                  <div
                    key={event.id}
                    className="absolute left-1.5 right-1.5 rounded-xl overflow-hidden cursor-pointer pointer-events-auto shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] backdrop-blur-sm border border-white/20"
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      background: `linear-gradient(135deg, ${event.backgroundColor || '#4eb8d5'}ee, ${event.backgroundColor || '#4eb8d5'}cc)`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                  >
                    <div className="p-2 text-white text-xs h-full overflow-hidden">
                      <div className="font-semibold truncate drop-shadow-sm">
                        {formatTime(event.start)} - {formatTime(event.end)} {event.clientName}
                      </div>
                      <div className="opacity-90 truncate text-[11px] mt-0.5">{event.title}</div>
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
