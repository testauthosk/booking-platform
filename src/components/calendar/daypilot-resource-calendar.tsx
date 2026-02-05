'use client';

import { useState, useEffect } from 'react';

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
const ukDaysShort = ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];

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
        <div className="sticky top-0 z-10 flex border-b border-gray-200 bg-gray-50">
          <div className="w-16 flex-shrink-0 border-r border-gray-200" />
          {resources.map(r => (
            <div
              key={r.id}
              className="flex-1 min-w-[100px] p-2 border-r border-gray-200 text-center"
            >
              <div
                className="w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-white font-bold text-sm mb-1"
                style={{ backgroundColor: r.color || '#9ca3af' }}
              >
                {r.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-xs font-medium text-gray-700 truncate">{r.name}</div>
            </div>
          ))}
        </div>

        {/* Сітка часу */}
        <div className="relative flex" style={{ minHeight: `${hours.length * 60}px` }}>
          {/* Колонка часу */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[60px] border-b border-gray-100 pr-2 text-right"
              >
                <span className="text-xs text-gray-500 font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Колонки ресурсів */}
          {resources.map(r => (
            <div
              key={r.id}
              className="flex-1 min-w-[100px] border-r border-gray-200 relative"
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
                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer overflow-hidden text-white shadow-sm hover:brightness-110 transition-all"
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        minHeight: '30px',
                        backgroundColor: event.backColor || r.color || '#22c55e',
                      }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold opacity-90">
                          {formatTime(event.start)}-{formatTime(event.end)}
                        </span>
                        {event.clientPhone && (
                          <a
                            href={`tel:${event.clientPhone}`}
                            onClick={e => e.stopPropagation()}
                            className="w-5 h-5 flex items-center justify-center bg-white/20 rounded-full"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                            </svg>
                          </a>
                        )}
                      </div>
                      <div className="text-xs font-semibold truncate flex items-center gap-1">
                        {event.clientName || event.text}
                        {event.isNewClient && (
                          <span className="px-1 text-[8px] font-bold bg-black/20 rounded">new</span>
                        )}
                      </div>
                      {event.clientPhone && (
                        <div className="text-[10px] opacity-80 truncate">{event.clientPhone}</div>
                      )}
                      {event.serviceName && (
                        <div className="text-[10px] opacity-70 truncate">{event.serviceName}</div>
                      )}
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Навігація по тижню */}
      <div className="border-t border-gray-200 bg-white px-2 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const today = isToday(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className={`
                  flex flex-col items-center justify-center w-10 h-14 rounded-xl transition-all
                  ${selected 
                    ? 'bg-yellow-400 text-gray-900 shadow-md' 
                    : today 
                      ? 'bg-gray-100 text-gray-900'
                      : 'hover:bg-gray-50'
                  }
                  ${weekend && !selected ? 'text-orange-500' : ''}
                `}
              >
                <span className={`text-xs font-medium ${selected ? 'text-gray-800' : 'text-gray-500'}`}>
                  {dayName}
                </span>
                <span className={`text-lg font-bold ${selected ? 'text-gray-900' : ''}`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Кнопка Сьогодні */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => handleDateSelect(new Date())}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          >
            Сьогодні
          </button>
        </div>
      </div>
    </div>
  );
}
