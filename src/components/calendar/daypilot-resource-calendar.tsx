'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [weekBarWidth, setWeekBarWidth] = useState(0);
  const weekBarRef = useRef<HTMLDivElement>(null);
  
  // Анімована позиція індикатора (дробове число 0-6)
  const [animatedPos, setAnimatedPos] = useState(-1);
  const animFrameRef = useRef<number>(0);
  const prevPosRef = useRef<number>(-1);

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

  // Вимірюємо ширину жовтої полоси
  useEffect(() => {
    if (weekBarRef.current) {
      setWeekBarWidth(weekBarRef.current.offsetWidth);
      const resizeObserver = new ResizeObserver(() => {
        if (weekBarRef.current) {
          setWeekBarWidth(weekBarRef.current.offsetWidth);
        }
      });
      resizeObserver.observe(weekBarRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [mounted]);

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

  // Поточний selectedIdx
  const selectedIdx = weekDays.findIndex(d => isSelected(d));
  
  // Анімація позиції індикатора через requestAnimationFrame
  useEffect(() => {
    if (animatedPos < 0) {
      // Перший рендер — без анімації
      setAnimatedPos(selectedIdx);
      prevPosRef.current = selectedIdx;
      return;
    }
    
    if (selectedIdx === prevPosRef.current) return;
    
    const from = prevPosRef.current;
    const to = selectedIdx;
    prevPosRef.current = to;
    const startTime = performance.now();
    const duration = 280; // ms
    
    // ease-out cubic
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = ease(progress);
      setAnimatedPos(from + (to - from) * eased);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [selectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

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
      
      {/* Десктопна навігація по тижню - поза скролом */}
      <div className="hidden lg:flex items-center justify-center gap-1 py-3 border-b border-gray-200 bg-gray-50">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            const todayClass = isToday(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl transition-all ${
                  selected 
                    ? 'bg-yellow-400 text-gray-900 shadow-md' 
                    : todayClass
                      ? 'bg-yellow-100 text-gray-900 hover:bg-yellow-200'
                      : 'hover:bg-gray-100'
                }`}
              >
                <span className={`text-xs font-medium ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-500'
                }`}>
                  {dayName}
                </span>
                <span className={`text-lg font-bold ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-800'
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
      </div>
        
      {/* Заголовки ресурсів - поза скролом */}
      <div className="flex border-b border-gray-200 bg-white">
        {/* Колонка часу - заголовок */}
        <div className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-300 py-2">
        </div>
          
          {resources.map((r, idx) => (
            <div
              key={r.id}
              className={`flex-1 min-w-0 py-2 text-center ${idx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
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

      {/* Скрол контейнер */}
      <div className="flex-1 overflow-auto">
        {/* Сітка часу */}
        <div className="relative flex" style={{ minHeight: `${hours.length * 60}px` }}>
          {/* Колонка часу */}
          <div className="w-10 lg:w-14 flex-shrink-0 border-r border-gray-300">
            {hours.map(hour => (
              <div
                key={hour}
                className="h-[60px] flex items-start justify-end pr-1 pt-0"
              >
                <span className="text-[9px] lg:text-xs text-gray-900 font-medium">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {/* Колонки ресурсів */}
          {resources.map((r, rIdx) => (
            <div
              key={r.id}
              className={`flex-1 min-w-0 relative ${rIdx < resources.length - 1 ? 'border-r border-gray-300' : ''}`}
              style={{ backgroundColor: `${r.color}18` }}
            >
              {/* Лінії годин */}
              {hours.map(hour => (
                <div key={hour} className="h-[60px] border-b border-gray-200" />
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
                      className="absolute left-0 right-0.5 rounded-r-lg cursor-pointer overflow-hidden transition-all active:scale-[0.98]"
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
        
        {/* Кінець робочого дня - надпис */}
        <div className="flex items-center justify-center py-2 mb-4 lg:mb-0 text-gray-400">
          <span className="text-sm">Робота закінчилась, час додому ❤️</span>
        </div>
      </div>{/* end scroll container */}

      {/* Навігація по тижню - жовта полоса над MobileNav */}
      <div 
        ref={weekBarRef}
        className="lg:hidden fixed bottom-[68px] left-[23px] right-[23px] z-40 h-[32px] flex items-end touch-none select-none overflow-visible"
        style={{ background: 'transparent' }}
      >
        {/* Єдиний SVG: жовтий фон + білий індикатор + чорна обводка — все синхронно */}
        {weekBarWidth > 0 && (() => {
          const pos = animatedPos >= 0 ? animatedPos : selectedIdx;
          const w = weekBarWidth;
          const barH = 32;
          const bump = 7;
          const cr = 16;
          const curve = 12;
          const cellW = w / 7;
          const indL = pos * cellW;
          const indR = indL + cellW;
          const pad = 1; // padding зверху щоб stroke не обрізався
          const topY = pad;
          const barTop = bump + pad;
          const totalH = bump + barH + pad;
          const sx = 0.5;
          
          // Клампимо для крайніх позицій
          const safeIndL = Math.max(0, indL);
          const safeIndR = Math.min(w, indR);
          
          // --- Жовтий фон (дві частини: ліворуч і праворуч від індикатора) ---
          const yellowLeft = safeIndL > 0 ? `
            M 0 ${totalH}
            L 0 ${barTop + cr}
            Q 0 ${barTop} ${Math.min(cr, safeIndL)} ${barTop}
            L ${safeIndL} ${barTop}
            L ${safeIndL} ${totalH}
            Z
          ` : '';
          
          const yellowRight = safeIndR < w ? `
            M ${safeIndR} ${totalH}
            L ${safeIndR} ${barTop}
            L ${Math.max(safeIndR, w - cr)} ${barTop}
            Q ${w} ${barTop} ${w} ${barTop + cr}
            L ${w} ${totalH}
            Z
          ` : '';
          
          // --- Білий індикатор ---
          const whitePath = `
            M ${safeIndL} ${totalH}
            L ${safeIndL} ${barTop}
            C ${safeIndL} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}
            L ${safeIndR - curve} ${topY}
            C ${safeIndR} ${topY} ${safeIndR} ${barTop} ${safeIndR} ${barTop}
            L ${safeIndR} ${totalH}
            Z
          `;
          
          // --- Обводка (єдина лінія) ---
          const leftEnd = sx + cr;
          const rightStart = w - cr - sx;
          
          let contour = '';
          
          // Ліва частина: стінка → кут → горизонталь → підйом індикатора
          if (safeIndL > leftEnd) {
            // Звичайний: Q-кут + горизонталь + C-крива підйому
            contour = `M ${sx} ${totalH} L ${sx} ${barTop + cr} Q ${sx} ${barTop} ${leftEnd} ${barTop} L ${safeIndL} ${barTop}`;
            contour += ` C ${safeIndL} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}`;
          } else {
            // Край: стінка плавно переходить в індикатор однією C-кривою
            contour = `M ${sx} ${totalH} L ${sx} ${barTop + curve}`;
            contour += ` C ${sx} ${barTop} ${safeIndL} ${topY} ${safeIndL + curve} ${topY}`;
          }
          
          // Верх індикатора
          contour += ` L ${safeIndR - curve} ${topY}`;
          
          // Права частина: спуск індикатора → горизонталь → кут → стінка
          if (safeIndR < rightStart) {
            // Звичайний: C-крива спуску + горизонталь + Q-кут
            contour += ` C ${safeIndR} ${topY} ${safeIndR} ${barTop} ${safeIndR} ${barTop}`;
            contour += ` L ${rightStart} ${barTop} Q ${w - sx} ${barTop} ${w - sx} ${barTop + cr}`;
          } else {
            // Край: індикатор плавно переходить в стінку однією C-кривою
            contour += ` C ${safeIndR} ${topY} ${w - sx} ${barTop} ${w - sx} ${barTop + curve}`;
          }
          
          contour += ` L ${w - sx} ${totalH}`;
          
          return (
            <svg 
              className="absolute pointer-events-none z-[2]"
              style={{ top: -(bump + pad), left: 0, width: w, height: totalH }}
            >
              {/* Жовтий фон */}
              {yellowLeft && <path d={yellowLeft} fill="#facc15" />}
              {yellowRight && <path d={yellowRight} fill="#facc15" />}
              {/* Білий індикатор */}
              <path d={whitePath} fill="white" />
              {/* Обводка */}
              <path d={contour} fill="none" stroke="black" strokeWidth="1" />
            </svg>
          );
        })()}
        
        <div className="relative flex items-center justify-around w-full h-[28px] touch-none overflow-visible z-[3]">
          {weekDays.map((day, idx) => {
            const dayNum = day.getDate();
            const dayName = ukDaysShort[day.getDay()];
            const selected = isSelected(day);
            const weekend = isWeekend(day);
            
            return (
              <button
                key={idx}
                onClick={() => handleDateSelect(day)}
                className="relative z-10 flex flex-col items-center justify-center flex-1 h-full"
              >
                <span className={`text-[9px] font-medium leading-none transition-colors duration-300 ${
                  selected ? 'text-gray-900' : weekend ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {dayName}
                </span>
                <span className={`text-[13px] font-bold leading-none mt-0.5 transition-colors duration-300 ${
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

      {/* FAB - кнопка додавання запису */}
      <button
        onClick={() => {
          // TODO: відкрити модалку створення запису
          alert('Додати новий запис');
        }}
        className="fixed bottom-[108px] lg:bottom-4 right-2 w-14 h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95 z-50"
      >
        <Plus className="w-7 h-7" strokeWidth={2} />
      </button>
    </div>
  );
}
