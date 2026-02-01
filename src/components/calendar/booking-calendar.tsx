'use client';

import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'uk': uk };

const DnDCalendar = withDragAndDrop(Calendar);

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

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

interface BookingCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onEventDrop?: (event: BookingEvent, start: Date, end: Date, resourceId?: string) => void;
  defaultView?: 'day' | 'week' | 'month';
  minTime?: Date;
  maxTime?: Date;
}

export function BookingCalendar({
  events = [],
  resources = [],
  onEventClick,
  onSlotClick,
  onEventDrop,
  defaultView = 'day',
  minTime = new Date(1970, 1, 1, 8, 0, 0),
  maxTime = new Date(1970, 1, 1, 21, 0, 0),
}: BookingCalendarProps) {
  const [view, setView] = useState(defaultView);
  const [date, setDate] = useState(new Date());

  const handleSelectEvent = useCallback((event: BookingEvent) => {
    onEventClick?.(event);
  }, [onEventClick]);

  const handleSelectSlot = useCallback((slotInfo: any) => {
    onSlotClick?.({
      start: slotInfo.start,
      end: slotInfo.end,
      resourceId: slotInfo.resourceId,
    });
  }, [onSlotClick]);

  const handleEventDrop = useCallback(({ event, start, end, resourceId }: any) => {
    onEventDrop?.(event, start, end, resourceId);
  }, [onEventDrop]);

  const eventStyleGetter = useCallback((event: BookingEvent) => {
    return {
      style: {
        backgroundColor: event.backgroundColor || '#8b5cf6',
        borderRadius: '6px',
        border: 'none',
        color: 'white',
        fontSize: '12px',
        padding: '2px 6px',
      },
    };
  }, []);

  const messages = useMemo(() => ({
    today: 'Сьогодні',
    previous: '‹',
    next: '›',
    month: 'Місяць',
    week: 'Тиждень',
    day: 'День',
    agenda: 'Список',
    date: 'Дата',
    time: 'Час',
    event: 'Подія',
    noEventsInRange: 'Немає записів',
    showMore: (total: number) => `+${total} ще`,
  }), []);

  const formats = useMemo(() => ({
    timeGutterFormat: 'HH:mm',
    eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`,
    dayHeaderFormat: (date: Date) => format(date, 'EEEE, d MMMM', { locale: uk }),
    dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
      `${format(start, 'd MMM', { locale: uk })} - ${format(end, 'd MMM yyyy', { locale: uk })}`,
    weekdayFormat: (date: Date) => format(date, 'EEE', { locale: uk }),
    monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy', { locale: uk }),
    agendaDateFormat: (date: Date) => format(date, 'd MMMM', { locale: uk }),
  }), []);

  // Check if touch device
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Custom event component with resize handles for mobile
  const EventComponent = ({ event }: { event: BookingEvent }) => (
    <div className="h-full overflow-hidden relative">
      {/* Top resize handle - circle with arrow */}
      {isTouchDevice && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
          <div className="w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className="px-2 py-1.5 h-full">
        <div className="font-medium truncate text-xs">{event.title}</div>
        {event.clientName && (
          <div className="text-xs opacity-90 truncate">{event.clientName}</div>
        )}
      </div>
      
      {/* Bottom resize handle - circle with arrow */}
      {isTouchDevice && (
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
          <div className="w-6 h-6 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center">
            <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  const viewConfig = resources.length > 0 ? Views.DAY : view;

  return (
    <div className="h-full booking-calendar">
      <DnDCalendar
        localizer={localizer}
        events={events}
        resources={resources.length > 0 ? resources : undefined}
        resourceIdAccessor="id"
        resourceTitleAccessor="title"
        startAccessor="start"
        endAccessor="end"
        view={viewConfig}
        onView={(v: any) => setView(v)}
        date={date}
        onNavigate={setDate}
        selectable
        resizable
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        onEventDrop={handleEventDrop}
        onEventResize={handleEventDrop}
        eventPropGetter={eventStyleGetter}
        draggableAccessor={() => !isTouchDevice}
        resizableAccessor={() => !isTouchDevice}
        messages={messages}
        formats={formats}
        min={minTime}
        max={maxTime}
        step={30}
        timeslots={2}
        defaultView={Views.DAY}
        views={resources.length > 0 ? [Views.DAY] : [Views.DAY, Views.WEEK, Views.MONTH]}
        components={{
          event: EventComponent,
        }}
        popup
        showMultiDayTimes
      />
    </div>
  );
}
