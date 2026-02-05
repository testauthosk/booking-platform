'use client';

import { useState, useEffect, useRef } from 'react';
import { DayPilot, DayPilotCalendar } from '@daypilot/daypilot-lite-react';

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

// Хелпер для конвертації DayPilot.Date в JS Date
function toJsDate(dpDate: any): Date {
  if (!dpDate) return new Date();
  if (dpDate instanceof Date) return dpDate;
  if (typeof dpDate === 'string') return new Date(dpDate);
  if (typeof dpDate.toDate === 'function') return dpDate.toDate();
  if (dpDate.value) return new Date(dpDate.value);
  return new Date(String(dpDate));
}

export function DayPilotResourceCalendar({
  resources,
  events,
  startDate,
  onDateChange,
  onEventClick,
  onEventMove,
  onEventResize,
  onTimeRangeSelect,
  dayStartHour = 8,
  dayEndHour = 21,
}: DayPilotResourceCalendarProps) {
  const calendarRef = useRef<any>(null);
  const [internalDate, setInternalDate] = useState(startDate);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setInternalDate(startDate);
  }, [startDate]);

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

  // Не рендеримо на сервері
  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-400">Завантаження календаря...</div>
        </div>
      </div>
    );
  }

  // Конвертуємо ресурси в формат DayPilot
  const columns = resources.map(r => ({
    id: r.id,
    name: r.name,
  }));

  // Конвертуємо події
  const dpEvents = events.map(e => ({
    id: e.id,
    text: e.clientName || e.text,
    start: e.start,
    end: e.end,
    resource: e.resource,
    backColor: e.backColor || '#22c55e',
  }));

  // Форматуємо дату як рядок YYYY-MM-DD
  const dpStartDate = `${internalDate.getFullYear()}-${String(internalDate.getMonth() + 1).padStart(2, '0')}-${String(internalDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Календар */}
      <div className="flex-1 overflow-hidden">
        <style>{`
          .calendar_default_main {
            border: none !important;
            font-family: system-ui, -apple-system, sans-serif !important;
          }
          .calendar_default_event {
            border-radius: 6px !important;
            border: none !important;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
          }
          .calendar_default_event_inner {
            border-radius: 6px !important;
            padding: 4px !important;
          }
          .calendar_default_colheader, .calendar_default_colheader_inner {
            background: #fafafa !important;
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }
          .calendar_default_rowheader, .calendar_default_rowheader_inner {
            background: #fafafa !important;
            border: none !important;
            border-right: 1px solid #e5e7eb !important;
          }
          .calendar_default_cell {
            border-color: #f3f4f6 !important;
          }
        `}</style>
        <DayPilotCalendar
          ref={calendarRef}
          viewType="Resources"
          startDate={dpStartDate}
          columns={columns}
          events={dpEvents}
          headerHeight={50}
          cellHeight={25}
          cellDuration={15}
          dayBeginsHour={dayStartHour}
          dayEndsHour={dayEndHour}
          heightSpec="Parent100Pct"
          timeFormat="Clock24Hours"
          onEventClick={(args: any) => {
            if (onEventClick) {
              const eventData = events.find(e => e.id === args.e.id());
              if (eventData) onEventClick(eventData);
            }
          }}
          onEventMoved={(args: any) => {
            if (onEventMove) {
              onEventMove(
                args.e.id(),
                toJsDate(args.newStart),
                toJsDate(args.newEnd),
                args.newResource
              );
            }
          }}
          onTimeRangeSelected={(args: any) => {
            if (onTimeRangeSelect) {
              onTimeRangeSelect(
                toJsDate(args.start),
                toJsDate(args.end),
                args.resource
              );
            }
            calendarRef.current?.control?.clearSelection();
          }}
        />
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
