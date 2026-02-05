'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  text: string;
  start: string;
  end: string;
  resource: string;
  backColor?: string;
  barColor?: string;
  clientName?: string;
  clientPhone?: string;
  serviceName?: string;
  isNewClient?: boolean;
  status?: string;
}

export interface CalendarResource {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

interface DayPilotResourceCalendarProps {
  resources: CalendarResource[];
  events: CalendarEvent[];
  startDate: Date;
  onDateChange?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onTimeRangeSelect?: (start: Date, end: Date, resourceId: string) => void;
  dayStartHour?: number;
  dayEndHour?: number;
}

// Українські назви днів
const ukDaysShort = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

export function DayPilotResourceCalendar({
  resources,
  events,
  startDate,
  onDateChange,
  onEventClick,
  onTimeRangeSelect,
  dayStartHour = 8,
  dayEndHour = 21,
}: DayPilotResourceCalendarProps) {
  const [internalDate, setInternalDate] = useState(startDate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInternalDate(startDate);
  }, [startDate]);

  // Генеруємо години для сітки
  const hours: number[] = [];
  for (let h = dayStartHour; h < dayEndHour; h++) {
    hours.push(h);
  }

  // Отримуємо дні тижня для навігації
  const getWeekDays = (date: Date) => {
    const days = [];
    const current = new Date(date);
    const dayOfWeek = current.getDay();
    const monday = new Date(current);
    monday.setDate(current.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(internalDate);
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };
  const isSelected = (date: Date) => date.toDateString() === internalDate.toDateString();
  const isWeekend = (date: Date) => date.getDay() === 0 || date.getDay() === 6;

  const handleDateSelect = (date: Date) => {
    setInternalDate(date);
    onDateChange?.(date);
  };

  // Фільтруємо події для поточної дати
  const dateStr = internalDate.toISOString().split('T')[0];
  const filteredEvents = events.filter(e => e.start.startsWith(dateStr));

  // Розраховуємо позицію події
  const getEventPosition = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const end = new Date(event.end);
    const startMinutes = start.getHours() * 60 + start.getMinutes() - dayStartHour * 60;
    const endMinutes = end.getHours() * 60 + end.getMinutes() - dayStartHour * 60;
    const totalMinutes = (dayEndHour - dayStartHour) * 60;
    
    return {
      top: (startMinutes / totalMinutes) * 100,
      height: ((endMinutes - startMinutes) / totalMinutes) * 100,
    };
  };

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Завантаження...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Календар */}
      <div className="flex-1 overflow-auto">
        {/* Заголовки ресурсів */}
        <div className="sticky top-0 z-10 flex border-b border-gray-100 bg-white py-1.5">
          {/* Кнопка додавання */}
          <div className="w-10 flex-shrink-0 flex items-center justify-center">
            <button className="w-6 h-6 flex items-center justify-center text-yellow-500">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>
          
          {resources.map(r => (
            <div
              key={r.id}
              className="flex-1 min-w-0 py-1 text-center"
            >
              {r.avatar ? (
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-9 h-9 mx-auto rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div
                  className="w-9 h-9 mx-auto rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: r.color || '#9ca3af' }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-[10px] font-medium text-gray-700 mt-1 truncate px-0.5">{r.name}</div>
            </div>
          ))}
        </div>

        {/* Сітка часу */}
        <div className="relative flex" style={{ minHeight: `${hours.length * 60}px` }}>
          {/* Колонка часу */}
          <div className="w-10 flex-shrink-0">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-1 pt-0"
              >
                <span className="text-[9px] text-gray-400 font-medium -mt-1.5">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Колонки ресурсів */}
          {resources.map((r, rIdx) => (
            <div
              key={r.id}
              className={`flex-1 min-w-0 relative ${rIdx < resources.length - 1 ? 'border-r border-gray-100' : ''}`}
              style={{ backgroundColor: `${r.color}08` }}
            >
              {/* Лінії годин */}
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-100" />
              ))}

              {/* Події */}
              {filteredEvents
                .filter(e => e.resource === r.id)
                .map(event => {
                  const pos = getEventPosition(event);
                  const bgColor = event.backColor || r.color || '#22c55e';
                  return (
                    <div
                      key={event.id}
                      className="absolute left-0.5 right-0.5 rounded-lg cursor-pointer overflow-hidden transition-all active:scale-[0.98]"
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        minHeight: '40px',
                        background: `linear-gradient(160deg, ${bgColor} 0%, ${bgColor}e0 100%)`,
                        boxShadow: `0 1px 4px ${bgColor}50, 0 2px 6px rgba(0,0,0,0.08)`,
                      }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="h-full p-1.5 text-white flex flex-col">
                        {/* Верхня строка: час + телефон */}
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-bold leading-none">
                            {formatTime(event.start)}-{formatTime(event.end)}
                          </span>
                          {event.clientPhone && (
                            <a
                              href={`tel:${event.clientPhone}`}
                              onClick={e => e.stopPropagation()}
                              className="w-5 h-5 flex-shrink-0 flex items-center justify-center bg-white/25 rounded-full"
                            >
                              <Phone className="w-3 h-3" fill="currentColor" />
                            </a>
                          )}
                        </div>
                        
                        {/* Ім'я клієнта */}
                        <div className="mt-0.5 flex items-center gap-1 flex-wrap min-w-0">
                          <span className="text-[11px] font-semibold leading-tight truncate">
                            {event.clientName || event.text}
                          </span>
                          {event.isNewClient && (
                            <span className="px-1 py-px text-[8px] font-bold bg-white/25 rounded text-white uppercase flex-shrink-0">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Телефон - тільки якщо є місце */}
                        {event.clientPhone && (
                          <div className="text-[9px] opacity-85 truncate">{event.clientPhone}</div>
                        )}
                        
                        {/* Послуга */}
                        {event.serviceName && (
                          <div className="text-[9px] opacity-75 mt-auto truncate">{event.serviceName}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Навігація по тижню - тонка жовта полоса */}
      <div className="bg-yellow-400 h-[44px] flex items-center px-2">
        <div className="flex items-center justify-between w-full">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className="flex flex-col items-center justify-center flex-1"
              >
                <span className={`text-[9px] font-medium leading-none ${weekend ? 'text-orange-600' : 'text-gray-700'}`}>
                  {dayName}
                </span>
                <div
                  className={`
                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-all
                    ${selected 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : weekend 
                        ? 'text-orange-600'
                        : 'text-gray-800'
                    }
                  `}
                >
                  {dayNum}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
