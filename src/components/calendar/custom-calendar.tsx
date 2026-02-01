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
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  dayStart?: number; // час начала (8)
  dayEnd?: number;   // час конца (21)
  slotDuration?: number; // минут (30)
}

export function CustomCalendar({
  events = [],
  resources = [],
  onEventClick,
  onSlotClick,
  dayStart = 8,
  dayEnd = 21,
  slotDuration = 30,
}: CustomCalendarProps) {
  // Генерируем временные слоты
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = dayStart; hour < dayEnd; hour++) {
      for (let min = 0; min < 60; min += slotDuration) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [dayStart, dayEnd, slotDuration]);

  // Получаем сегодняшнюю дату для расчётов
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Функция для расчёта позиции события
  const getEventPosition = (event: BookingEvent) => {
    const startHour = event.start.getHours();
    const startMin = event.start.getMinutes();
    const endHour = event.end.getHours();
    const endMin = event.end.getMinutes();

    // Начальный слот (с учётом dayStart)
    const startSlot = (startHour - dayStart) * (60 / slotDuration) + Math.floor(startMin / slotDuration);
    // Количество слотов
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const slotCount = Math.ceil(durationMinutes / slotDuration);

    return { startSlot, slotCount };
  };

  // Получаем события для конкретного ресурса
  const getEventsForResource = (resourceId: string) => {
    return events.filter(e => e.resourceId === resourceId);
  };

  // Обработка клика на слот
  const handleSlotClick = (time: string, resourceId: string) => {
    if (!onSlotClick) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(todayStr);
    start.setHours(hours, minutes, 0, 0);
    
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + slotDuration);
    
    onSlotClick({ start, end, resourceId });
  };

  // Текущее время для индикатора
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const isToday = now.toISOString().split('T')[0] === todayStr;
  const currentTimePosition = isToday && currentHour >= dayStart && currentHour < dayEnd
    ? ((currentHour - dayStart) * 60 + currentMin) / ((dayEnd - dayStart) * 60) * 100
    : null;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header с мастерами */}
      <div 
        className="grid border-b border-border shrink-0"
        style={{ 
          gridTemplateColumns: `60px repeat(${resources.length}, 1fr)`,
        }}
      >
        {/* Пустая ячейка над временем */}
        <div className="h-14 border-r border-border bg-muted/30" />
        
        {/* Имена мастеров */}
        {resources.map((resource, idx) => (
          <div
            key={resource.id}
            className="h-14 flex items-center justify-center px-2 font-medium text-sm border-r border-border last:border-r-0"
            style={{ color: resource.color }}
          >
            <span className="truncate">{resource.title}</span>
          </div>
        ))}
      </div>

      {/* Контент календаря */}
      <div className="flex-1 overflow-auto relative">
        {/* Индикатор текущего времени */}
        {currentTimePosition !== null && (
          <>
            {/* Время слева */}
            <div 
              className="absolute left-0 z-20 bg-red-500 text-white text-[10px] px-1 py-0.5 rounded-sm font-medium"
              style={{ top: `calc(${currentTimePosition}% - 8px)` }}
            >
              {`${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`}
            </div>
            {/* Линия */}
            <div 
              className="absolute left-[60px] right-0 h-0.5 bg-red-500 z-10"
              style={{ top: `${currentTimePosition}%` }}
            />
          </>
        )}

        {/* Grid сетка */}
        <div 
          className="grid min-h-full"
          style={{ 
            gridTemplateColumns: `60px repeat(${resources.length}, 1fr)`,
            gridTemplateRows: `repeat(${timeSlots.length}, 40px)`,
          }}
        >
          {/* Временные метки и слоты */}
          {timeSlots.map((time, rowIdx) => (
            <>
              {/* Время слева */}
              <div
                key={`time-${time}`}
                className="border-r border-b border-border flex items-start justify-end pr-2 pt-1 text-xs text-muted-foreground bg-muted/30"
              >
                {time.endsWith(':00') ? time : ''}
              </div>

              {/* Ячейки для каждого ресурса */}
              {resources.map((resource, colIdx) => (
                <div
                  key={`cell-${time}-${resource.id}`}
                  className="border-r border-b border-border last:border-r-0 relative hover:bg-muted/20 cursor-pointer transition-colors"
                  style={{
                    borderBottomStyle: time.endsWith(':00') ? 'solid' : 'dashed',
                    borderBottomColor: time.endsWith(':00') ? 'hsl(var(--border))' : 'hsl(var(--border) / 0.5)',
                  }}
                  onClick={() => handleSlotClick(time, resource.id)}
                />
              ))}
            </>
          ))}
        </div>

        {/* События (абсолютное позиционирование) */}
        <div 
          className="absolute top-0 left-[60px] right-0 bottom-0 pointer-events-none"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${resources.length}, 1fr)`,
          }}
        >
          {resources.map((resource, colIdx) => (
            <div key={resource.id} className="relative">
              {getEventsForResource(resource.id).map((event) => {
                const { startSlot, slotCount } = getEventPosition(event);
                const slotHeight = 40; // px
                const top = startSlot * slotHeight;
                const height = slotCount * slotHeight;

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
                      <div className="font-medium truncate">
                        {event.clientName}
                      </div>
                      <div className="opacity-80 truncate">
                        {event.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
