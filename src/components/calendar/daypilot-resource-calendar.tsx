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
            <button className="w-7 h-7 flex items-center justify-center text-yellow-500 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors">
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
                  className="w-9 h-9 mx-auto rounded-lg object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div
                  className="w-9 h-9 mx-auto rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm"
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
                        minHeight: '36px',
                        background: `linear-gradient(160deg, ${bgColor} 0%, ${bgColor}e0 100%)`,
                        boxShadow: `0 1px 4px ${bgColor}50, 0 2px 6px rgba(0,0,0,0.08)`,
                      }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="h-full p-1.5 text-white relative">
                        {/* Іконка телефону - справа, текст обтікає */}
                        {event.clientPhone && (
                          <a
                            href={`tel:${event.clientPhone}`}
                            onClick={e => e.stopPropagation()}
                            className="float-right ml-1 w-6 h-6 flex items-center justify-center bg-white/25 rounded-full"
                          >
                            <Phone className="w-3.5 h-3.5" fill="currentColor" />
                          </a>
                        )}
                        
                        {/* Час */}
                        <div className="text-[10px] font-bold leading-tight">
                          {formatTime(event.start)}-{formatTime(event.end)}
                        </div>
                        
                        {/* Ім'я клієнта */}
                        <div className="text-[11px] font-semibold leading-tight">
                          {event.clientName || event.text}
                          {event.isNewClient && (
                            <span className="ml-1 px-1 py-px text-[7px] font-bold bg-white/25 rounded text-white uppercase align-middle">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Телефон */}
                        {event.clientPhone && (
                          <div className="text-[9px] opacity-90 leading-tight">{event.clientPhone}</div>
                        )}
                        
                        {/* Послуга */}
                        {event.serviceName && (
                          <div className="text-[9px] opacity-80 leading-tight">{event.serviceName}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Навігація по тижню - жовта полоса над MobileNav */}
      <div className="lg:hidden sticky bottom-16 z-40 bg-yellow-400 h-[38px] flex items-center px-2 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around w-full">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded-lg transition-all duration-200
                  ${selected 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-yellow-300/50'
                  }
                `}
              >
                <span className={`text-[10px] font-medium transition-colors duration-200 ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {dayName}
                </span>
                <span className={`text-sm font-bold transition-colors duration-200 ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-800'
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
