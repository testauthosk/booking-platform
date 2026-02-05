'use client';

import { useState, useEffect } from 'react';
import { Phone, Plus, Calendar, LayoutList, Users, Menu } from 'lucide-react';

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
        <div className="sticky top-0 z-10 flex border-b border-gray-100 bg-white pt-2">
          {/* Кнопка додавання */}
          <div className="w-12 flex-shrink-0 flex items-center justify-center">
            <button className="w-8 h-8 flex items-center justify-center text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors">
              <Plus className="w-6 h-6" strokeWidth={2.5} />
            </button>
          </div>
          
          {resources.map(r => (
            <div
              key={r.id}
              className="flex-1 min-w-[90px] py-2 text-center"
            >
              {r.avatar ? (
                <img
                  src={r.avatar}
                  alt={r.name}
                  className="w-11 h-11 mx-auto rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div
                  className="w-11 h-11 mx-auto rounded-full flex items-center justify-center text-white font-bold text-base shadow-sm"
                  style={{ backgroundColor: r.color || '#9ca3af' }}
                >
                  {r.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-xs font-medium text-gray-700 mt-1.5 truncate px-1">{r.name}</div>
            </div>
          ))}
        </div>

        {/* Сітка часу */}
        <div className="relative flex" style={{ minHeight: `${hours.length * 80}px` }}>
          {/* Колонка часу */}
          <div className="w-12 flex-shrink-0">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[80px] flex items-start justify-end pr-2 pt-0"
              >
                <span className="text-[11px] text-gray-400 font-medium -mt-2">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Колонки ресурсів */}
          {resources.map((r, rIdx) => (
            <div
              key={r.id}
              className={`flex-1 min-w-[90px] relative ${rIdx < resources.length - 1 ? 'border-r border-gray-100' : ''}`}
              style={{ backgroundColor: `${r.color}08` }}
            >
              {/* Лінії годин */}
              {hours.map(hour => (
                <div key={hour} className="h-[80px] border-b border-gray-100" />
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
                      className="absolute left-1.5 right-1.5 rounded-xl cursor-pointer overflow-hidden transition-all hover:scale-[1.02] hover:z-10"
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        minHeight: '55px',
                        background: `linear-gradient(145deg, ${bgColor} 0%, ${bgColor}dd 100%)`,
                        boxShadow: `0 2px 8px ${bgColor}40, 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15)`,
                      }}
                      onClick={() => onEventClick?.(event)}
                    >
                      <div className="h-full p-2.5 text-white flex flex-col relative">
                        {/* Верхня строка: час + телефон */}
                        <div className="flex items-start justify-between">
                          <span className="text-[11px] font-bold tracking-wide drop-shadow-sm">
                            {formatTime(event.start)}-{formatTime(event.end)}
                          </span>
                          {event.clientPhone && (
                            <a
                              href={`tel:${event.clientPhone}`}
                              onClick={e => e.stopPropagation()}
                              className="w-7 h-7 -mt-1 -mr-1 flex items-center justify-center bg-white/30 backdrop-blur-sm rounded-full hover:bg-white/50 transition-all shadow-sm"
                            >
                              <Phone className="w-4 h-4 drop-shadow-sm" fill="currentColor" />
                            </a>
                          )}
                        </div>
                        
                        {/* Ім'я клієнта */}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold leading-tight drop-shadow-sm">
                            {event.clientName || event.text}
                          </span>
                          {event.isNewClient && (
                            <span className="px-2 py-0.5 text-[10px] font-black bg-white/30 backdrop-blur-sm rounded-md text-white uppercase tracking-wider shadow-sm">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Телефон */}
                        {event.clientPhone && (
                          <div className="text-[12px] font-medium opacity-90 mt-0.5 drop-shadow-sm">{event.clientPhone}</div>
                        )}
                        
                        {/* Послуга */}
                        {event.serviceName && (
                          <div className="text-[11px] font-medium opacity-80 mt-auto drop-shadow-sm">{event.serviceName}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>

      {/* Навігація по тижню - жовта полоса */}
      <div className="bg-yellow-400 px-3 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className="flex flex-col items-center justify-center transition-all"
              >
                <span className={`text-[11px] font-medium ${weekend ? 'text-orange-600' : 'text-gray-700'}`}>
                  {dayName}
                </span>
                <div
                  className={`
                    w-9 h-9 flex items-center justify-center rounded-full text-base font-bold mt-0.5 transition-all
                    ${selected 
                      ? 'bg-white text-gray-900 shadow-md' 
                      : weekend 
                        ? 'text-orange-600 hover:bg-yellow-300'
                        : 'text-gray-800 hover:bg-yellow-300'
                    }
                  `}
                >
                  {dayNum}
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Кнопка Сьогодні */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => handleDateSelect(new Date())}
            className="px-5 py-1.5 text-sm font-medium text-gray-700 bg-white rounded-full shadow-sm hover:shadow transition-shadow"
          >
            Сьогодні
          </button>
        </div>
      </div>

      {/* Нижня навігація - як в референсі */}
      <div className="flex items-center justify-around py-2 bg-white border-t border-gray-200">
        <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-yellow-600">
          <Calendar className="w-6 h-6" />
          <span className="text-[10px] font-medium">Календар</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
          <LayoutList className="w-6 h-6" />
          <span className="text-[10px] font-medium">Графік</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
          <Users className="w-6 h-6" />
          <span className="text-[10px] font-medium">Клієнти</span>
        </button>
        <button className="flex flex-col items-center gap-0.5 px-3 py-1 text-gray-400">
          <Menu className="w-6 h-6" />
          <span className="text-[10px] font-medium">Більше</span>
        </button>
      </div>
    </div>
  );
}
