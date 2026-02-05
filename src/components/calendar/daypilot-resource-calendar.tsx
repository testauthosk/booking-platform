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
  const calendarRef = useRef<DayPilotCalendar>(null);
  const [internalDate, setInternalDate] = useState(startDate);

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

  // Конвертуємо ресурси в формат DayPilot
  const columns = resources.map(r => ({
    id: r.id,
    name: r.name,
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;">
        ${r.avatar 
          ? `<img src="${r.avatar}" style="width:44px;height:44px;border-radius:14px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,0.12);border:2px solid white;" />`
          : `<div style="width:44px;height:44px;border-radius:14px;background:${r.color || '#9ca3af'};display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.12);border:2px solid white;">
              ${r.name.charAt(0).toUpperCase()}
            </div>`
        }
        <span style="font-weight:600;font-size:12px;color:#1f2937;">${r.name.split(' ')[0]}</span>
      </div>
    `,
  }));

  // Конфігурація календаря
  const config: any = {
    viewType: 'Resources',
    headerHeight: 85,
    cellHeight: 25,
    cellDuration: 15,
    dayBeginsHour: dayStartHour,
    dayEndsHour: dayEndHour,
    timeRangeSelectedHandling: 'Enabled',
    eventMoveHandling: 'Update',
    eventResizeHandling: 'Update',
    eventClickHandling: 'Enabled',
    heightSpec: 'Parent100Pct',
    
    // Формат часу 24h
    timeFormat: 'Clock24Hours',
    
    // Кастомізація відображення подій
    onBeforeEventRender: (args: any) => {
      const e = args.data;
      const isNew = e.tags?.isNewClient;
      const startTime = formatTime(e.start);
      const endTime = formatTime(e.end);
      
      // Компактний HTML для картки
      args.data.html = `
        <div style="padding:3px 6px;height:100%;display:flex;flex-direction:column;justify-content:center;gap:1px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="display:flex;align-items:center;justify-content:space-between;">
            <span style="font-weight:700;font-size:11px;opacity:0.9;">${startTime}-${endTime}</span>
            ${e.tags?.clientPhone ? `
              <a href="tel:${e.tags.clientPhone}" onclick="event.stopPropagation();" 
                 style="width:22px;height:22px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.25);border-radius:50%;margin-left:4px;flex-shrink:0;">
                <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              </a>
            ` : ''}
          </div>
          <div style="font-weight:600;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:4px;">
            ${e.tags?.clientName || e.text}
            ${isNew ? '<span style="padding:1px 4px;font-size:8px;font-weight:700;background:rgba(0,0,0,0.15);border-radius:3px;text-transform:uppercase;letter-spacing:0.5px;">new</span>' : ''}
          </div>
          ${e.tags?.clientPhone ? `<div style="font-size:10px;opacity:0.85;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.tags.clientPhone}</div>` : ''}
          ${e.tags?.serviceName ? `<div style="font-size:10px;opacity:0.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.tags.serviceName}</div>` : ''}
        </div>
      `;
      
      // Колір рамки трохи темніший за фон
      args.data.barColor = args.data.backColor;
    },

    // Кастомізація заголовків часу
    onBeforeTimeHeaderRender: (args: any) => {
      // Форматуємо час як 09:00, 10:00
      const hour = args.header.start.getHours();
      args.header.html = `<span style="font-size:12px;font-weight:500;color:#6b7280;">${hour.toString().padStart(2, '0')}:00</span>`;
    },

    onEventClick: (args: any) => {
      if (onEventClick) {
        const eventData = events.find(e => e.id === args.e.id());
        if (eventData) {
          onEventClick(eventData);
        }
      }
    },

    onEventMoved: (args: any) => {
      if (onEventMove) {
        onEventMove(
          args.e.id(),
          args.newStart.toDate(),
          args.newEnd.toDate(),
          args.newResource
        );
      }
    },

    onEventResized: (args: any) => {
      if (onEventResize) {
        onEventResize(
          args.e.id(),
          args.newStart.toDate(),
          args.newEnd.toDate()
        );
      }
    },

    onTimeRangeSelected: (args: any) => {
      if (onTimeRangeSelect) {
        onTimeRangeSelect(
          args.start.toDate(),
          args.end.toDate(),
          args.resource
        );
      }
      if (calendarRef.current) {
        calendarRef.current.control.clearSelection();
      }
    },
  };

  // Конвертуємо події
  const dpEvents = events.map(e => ({
    id: e.id,
    text: e.clientName || e.text,
    start: e.start,
    end: e.end,
    resource: e.resource,
    backColor: e.backColor || '#22c55e',
    tags: {
      clientName: e.clientName,
      clientPhone: e.clientPhone,
      serviceName: e.serviceName,
      isNewClient: e.isNewClient,
      status: e.status,
    },
  }));

  const dpStartDate = DayPilot.Date.fromYearMonthDay(
    internalDate.getFullYear(),
    internalDate.getMonth() + 1,
    internalDate.getDate()
  );

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
            border-left: 3px solid rgba(0,0,0,0.2) !important;
            padding: 0 !important;
          }
          .calendar_default_colheader, .calendar_default_colheader_inner {
            background: linear-gradient(to bottom, #fafafa, #f5f5f5) !important;
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
          .calendar_default_cell_inner {
            background: #ffffff !important;
          }
          .calendar_default_cell_business .calendar_default_cell_inner {
            background: #ffffff !important;
          }
          .calendar_default_corner {
            background: #fafafa !important;
            border: none !important;
          }
          .calendar_default_colheader_cell_inner {
            border: none !important;
          }
          .calendar_default_rowheader_minutes {
            font-size: 10px !important;
            color: #9ca3af !important;
          }
          .calendar_default_event:hover {
            filter: brightness(1.05);
          }
        `}</style>
        <DayPilotCalendar
          ref={calendarRef}
          startDate={dpStartDate}
          {...config}
          columns={columns}
          events={dpEvents}
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

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
