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
  // Додаткові дані
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
  onEventClick?: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => void;
  onEventResize?: (eventId: string, newStart: Date, newEnd: Date) => void;
  onTimeRangeSelect?: (start: Date, end: Date, resourceId: string) => void;
  dayStartHour?: number;
  dayEndHour?: number;
}

export function DayPilotResourceCalendar({
  resources,
  events,
  startDate,
  onEventClick,
  onEventMove,
  onEventResize,
  onTimeRangeSelect,
  dayStartHour = 8,
  dayEndHour = 21,
}: DayPilotResourceCalendarProps) {
  const calendarRef = useRef<DayPilotCalendar>(null);

  // Конвертуємо ресурси в формат DayPilot
  const columns = resources.map(r => ({
    id: r.id,
    name: r.name,
    html: r.avatar 
      ? `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;">
           <img src="${r.avatar}" style="width:48px;height:48px;border-radius:12px;object-fit:cover;box-shadow:0 2px 8px rgba(0,0,0,0.15);" />
           <span style="font-weight:600;font-size:13px;color:#374151;">${r.name.split(' ')[0]}</span>
         </div>`
      : `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;">
           <div style="width:48px;height:48px;border-radius:12px;background:${r.color || '#9ca3af'};display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
             ${r.name.charAt(0).toUpperCase()}
           </div>
           <span style="font-weight:600;font-size:13px;color:#374151;">${r.name.split(' ')[0]}</span>
         </div>`,
  }));

  // Конфігурація календаря
  const config = {
    viewType: 'Resources' as const,
    headerHeight: 80,
    cellHeight: 30,
    cellDuration: 15,
    dayBeginsHour: dayStartHour,
    dayEndsHour: dayEndHour,
    timeRangeSelectedHandling: 'Enabled' as const,
    eventMoveHandling: 'Update' as const,
    eventResizeHandling: 'Update' as const,
    eventClickHandling: 'Enabled' as const,
    
    // Кастомізація відображення подій
    onBeforeEventRender: (args: any) => {
      const e = args.data;
      const isNew = e.tags?.isNewClient;
      
      // HTML для картки запису
      args.data.html = `
        <div style="padding:4px 8px;height:100%;display:flex;flex-direction:column;gap:2px;font-size:12px;overflow:hidden;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:700;font-size:11px;">${formatTime(e.start)} - ${formatTime(e.end)}</span>
            ${e.tags?.clientPhone ? `
              <a href="tel:${e.tags.clientPhone}" onclick="event.stopPropagation();" style="width:20px;height:20px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.2);border-radius:50%;">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
              </a>
            ` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.tags?.clientName || e.text}</span>
            ${isNew ? '<span style="padding:1px 4px;font-size:9px;font-weight:700;background:rgba(255,255,255,0.25);border-radius:3px;text-transform:uppercase;">new</span>' : ''}
          </div>
          ${e.tags?.clientPhone ? `<div style="opacity:0.8;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.tags.clientPhone}</div>` : ''}
          ${e.tags?.serviceName ? `<div style="opacity:0.7;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${e.tags.serviceName}</div>` : ''}
        </div>
      `;
      
      // Стиль картки
      args.data.cssClass = 'booking-event';
      args.data.borderColor = 'darker';
    },

    // Обробники подій
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
      // Очищаємо виділення
      if (calendarRef.current) {
        calendarRef.current.control.clearSelection();
      }
    },
  };

  // Конвертуємо події в формат DayPilot
  const dpEvents = events.map(e => ({
    id: e.id,
    text: e.clientName || e.text,
    start: e.start,
    end: e.end,
    resource: e.resource,
    backColor: e.backColor || '#4eb8d5',
    barColor: e.barColor,
    tags: {
      clientName: e.clientName,
      clientPhone: e.clientPhone,
      serviceName: e.serviceName,
      isNewClient: e.isNewClient,
      status: e.status,
    },
  }));

  return (
    <div className="daypilot-calendar-wrapper" style={{ height: '100%' }}>
      <style>{`
        .daypilot-calendar-wrapper .calendar_default_event {
          border-radius: 4px !important;
          font-family: inherit !important;
        }
        .daypilot-calendar-wrapper .calendar_default_event_inner {
          border-radius: 4px !important;
          border-left: 3px solid rgba(0,0,0,0.2) !important;
        }
        .daypilot-calendar-wrapper .calendar_default_colheader {
          background: #fafafa !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .daypilot-calendar-wrapper .calendar_default_rowheader {
          background: #fafafa !important;
        }
        .daypilot-calendar-wrapper .calendar_default_cell {
          border-color: #f3f4f6 !important;
        }
        .daypilot-calendar-wrapper .calendar_default_cell_business {
          background: #ffffff !important;
        }
      `}</style>
      <DayPilotCalendar
        ref={calendarRef}
        startDate={DayPilot.Date.today()}
        {...config}
        columns={columns}
        events={dpEvents}
      />
    </div>
  );
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
