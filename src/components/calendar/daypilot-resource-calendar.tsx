'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Phone, MessageCircle, User, Clock, Scissors } from 'lucide-react';

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

// Затемнити колір на X%
function darkenColor(hex: string, percent: number = 20): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const R = Math.max((num >> 16) - Math.round(2.55 * percent), 0);
  const G = Math.max((num >> 8 & 0x00FF) - Math.round(2.55 * percent), 0);
  const B = Math.max((num & 0x0000FF) - Math.round(2.55 * percent), 0);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Відкрити модалку з деталями запису
  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
  };

  // Закрити модалку
  const closeModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedEvent(null), 300);
  };

  // Отримати ресурс (майстра) за id
  const getResourceById = (resourceId: string) => {
    return resources.find(r => r.id === resourceId);
  };

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
                  const borderColor = darkenColor(bgColor, 25);
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
                        borderLeft: `3px solid ${borderColor}`,
                        borderTop: `1px solid ${borderColor}`,
                        borderRight: `1px solid ${borderColor}`,
                        borderBottom: `1px solid ${borderColor}`,
                      }}
                      onClick={() => openEventModal(event)}
                    >
                      <div className="h-full p-1.5 text-white relative flex flex-col justify-center">
                        {/* Час */}
                        <div className="text-[10px] font-bold leading-tight opacity-90">
                          {formatTime(event.start)}
                        </div>
                        
                        {/* Ім'я клієнта + NEW бейдж */}
                        <div className="text-[11px] font-semibold leading-tight truncate">
                          {event.clientName || event.text}
                          {event.isNewClient && (
                            <span className="ml-1 px-1 py-px text-[7px] font-bold bg-white/30 rounded text-white uppercase align-middle">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Послуга */}
                        {event.serviceName && (
                          <div className="text-[9px] opacity-80 leading-tight truncate">{event.serviceName}</div>
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
      <div className="lg:hidden sticky bottom-16 z-40 bg-yellow-400 h-[38px] flex items-center shadow-[0_-2px_8px_rgba(0,0,0,0.1)] touch-none select-none overscroll-none">
        <div className="relative flex items-center justify-between w-full px-3 touch-none">
          {/* Плаваючий індикатор — зливається з меню знизу */}
          <div 
            className="absolute bg-white rounded-t-lg shadow-[0_-2px_8px_rgba(0,0,0,0.1)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-0"
            style={{
              width: 'calc((100% - 24px) / 7)',
              left: `calc(12px + ${weekDays.findIndex(d => isSelected(d)) * (100 - 24/3.5) / 7}%)`,
              top: '4px',
              bottom: '0px',
            }}
          />
          
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className="relative z-10 flex flex-col items-center justify-center flex-1 h-[30px]"
              >
                <span className={`text-[9px] font-medium leading-none transition-colors duration-300 ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {dayName}
                </span>
                <span className={`text-[13px] font-bold leading-none transition-colors duration-300 ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-800'
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Модалка деталей запису */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeModal}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-white rounded-t-3xl shadow-2xl z-[101] transform transition-transform duration-300 ease-out max-h-[85vh] overflow-hidden ${
          modalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {selectedEvent && (() => {
          const master = getResourceById(selectedEvent.resource);
          const masterColor = master?.color || '#8b5cf6';
          return (
            <>
              {/* Заголовок */}
              <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
                <h2 className="font-semibold text-lg">Деталі запису</h2>
                <button 
                  onClick={closeModal}
                  className="h-9 w-9 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Картка запису */}
                <div className="rounded-2xl p-4" style={{ backgroundColor: `${masterColor}15`, borderLeft: `4px solid ${masterColor}` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4" style={{ color: masterColor }} />
                    <span className="font-bold text-lg">{formatTime(selectedEvent.start)} — {formatTime(selectedEvent.end)}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedEvent.clientName}</span>
                      {selectedEvent.isNewClient && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-green-100 text-green-700 rounded-full uppercase">
                          новий
                        </span>
                      )}
                    </div>
                    
                    {selectedEvent.serviceName && (
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{selectedEvent.serviceName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Картка майстра */}
                {master && (
                  <div className="rounded-2xl border p-4">
                    <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Майстер</p>
                    <div className="flex items-center gap-3">
                      {master.avatar ? (
                        <img src={master.avatar} alt={master.name} className="w-12 h-12 rounded-xl object-cover" />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: masterColor }}
                        >
                          {master.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-lg">{master.name}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Картка клієнта */}
                <div className="rounded-2xl border p-4">
                  <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">Клієнт</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-lg">
                        {selectedEvent.clientName?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">{selectedEvent.clientName}</p>
                        {selectedEvent.clientPhone && (
                          <p className="text-sm text-gray-500">{selectedEvent.clientPhone}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Кнопки зв'язку */}
                    {selectedEvent.clientPhone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${selectedEvent.clientPhone}`}
                          className="h-11 w-11 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                        >
                          <Phone className="h-5 w-5" />
                        </a>
                        <a
                          href={`https://t.me/${selectedEvent.clientPhone?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-11 w-11 rounded-xl bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
