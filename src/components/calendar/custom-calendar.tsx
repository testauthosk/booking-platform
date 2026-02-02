'use client';

import { useMemo, useRef } from 'react';
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
}: CustomCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);

  // Синхронизация скролла header и body
  const handleScroll = () => {
    if (scrollRef.current && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = scrollRef.current.scrollLeft;
    }
  };

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
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
    
    const startMinutes = (startHour - dayStart) * 60 + startMin;
    const endMinutes = (endHour - dayStart) * 60 + endMin;
    const durationMinutes = Math.max(30, endMinutes - startMinutes);
    
    return { startMinutes, durationMinutes };
  };

  const getEventsForResource = (resourceId: string) => {
    return events.filter(e => e.resourceId === resourceId);
  };

  const handleSlotClick = (hour: number, resourceId: string) => {
    if (!onSlotClick) return;
    const start = new Date(currentDateStr);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);
    onSlotClick({ start, end, resourceId });
  };

  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  
  const hourHeight = 60; // 60px на час
  const headerHeight = 80;
  const timeColWidth = 50;
  const colMinWidth = 120;
  
  const formatTime = (date: Date) => 
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  const currentTimeTop = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / 60 * hourHeight
    : null;

  // Получить только имя (первое слово)
  const getFirstName = (fullName: string) => fullName.split(' ')[0];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* FIXED HEADER */}
      <div className="flex-shrink-0 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-700/60 z-20">
        <div className="flex">
          {/* Time column header */}
          <div 
            className="flex-shrink-0 border-r border-slate-200/60 dark:border-slate-700/60"
            style={{ width: timeColWidth, height: headerHeight }}
          />
          {/* Resources header - scrollable */}
          <div 
            ref={headerScrollRef}
            className="flex-1 overflow-hidden"
          >
            <div 
              className="flex"
              style={{ minWidth: resources.length * colMinWidth }}
            >
              {resources.map((resource, idx) => (
                <div
                  key={`header-${resource.id}`}
                  className={`flex flex-col items-center justify-center py-2 gap-1 border-r border-slate-200/60 dark:border-slate-700/60`}
                  style={{ minWidth: colMinWidth, flex: 1, height: headerHeight }}
                >
                  <div 
                    className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden shadow-lg ring-2 ring-white/60"
                    style={{ backgroundColor: resource.color || '#9ca3af' }}
                  >
                    {resource.avatar ? (
                      <Image 
                        src={resource.avatar} 
                        alt={resource.title} 
                        width={44} 
                        height={44} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-base font-semibold">
                        {resource.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center px-1">
                    {getFirstName(resource.title)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE BODY */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto"
        onScroll={handleScroll}
      >
        <div className="flex relative" style={{ minWidth: timeColWidth + resources.length * colMinWidth }}>
          {/* Time column */}
          <div 
            className="flex-shrink-0 sticky left-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80"
            style={{ width: timeColWidth }}
          >
            {timeSlots.map((time, idx) => (
              <div
                key={`time-${time}`}
                className="flex items-start justify-end pr-2 border-r border-slate-200/60 dark:border-slate-700/60"
                style={{ height: hourHeight }}
              >
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold -mt-1.5">
                  {time}
                </span>
              </div>
            ))}
          </div>

          {/* Resource columns */}
          <div className="flex-1 flex">
            {resources.map((resource) => (
              <div
                key={`col-${resource.id}`}
                className="relative border-r border-slate-200/60 dark:border-slate-700/60"
                style={{ minWidth: colMinWidth, flex: 1 }}
              >
                {/* Hour lines */}
                {timeSlots.map((time, idx) => (
                  <div
                    key={`cell-${time}-${resource.id}`}
                    className="border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-white/40 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    style={{ height: hourHeight }}
                    onClick={() => handleSlotClick(dayStart + idx, resource.id)}
                  />
                ))}

                {/* Events */}
                {getEventsForResource(resource.id).map((event) => {
                  const { startMinutes, durationMinutes } = getEventPosition(event);
                  // Точное позиционирование — карточка касается линий времени
                  const top = (startMinutes / 60) * hourHeight;
                  const height = (durationMinutes / 60) * hourHeight;

                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all hover:scale-[1.005] border border-white/20"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        background: `linear-gradient(145deg, ${event.backgroundColor || '#4eb8d5'}, ${event.backgroundColor || '#4eb8d5'}ee)`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      <div className="p-1.5 text-white h-full overflow-hidden">
                        <div className="font-semibold text-[11px] drop-shadow-sm">
                          {formatTime(event.start)} - {formatTime(event.end)}
                        </div>
                        <div className="font-medium text-xs truncate">{event.clientName}</div>
                        {height > 50 && (
                          <div className="opacity-80 text-[10px] truncate">{event.title}</div>
                        )}
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
                className="absolute z-30 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-sm font-semibold shadow-md"
                style={{ 
                  top: currentTimeTop - 8,
                  left: 2,
                }}
              >
                {`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`}
              </div>
              <div 
                className="absolute h-0.5 bg-red-500 z-20 shadow-sm"
                style={{ 
                  top: currentTimeTop,
                  left: timeColWidth,
                  right: 0,
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
