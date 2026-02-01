'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
// Resource plugin requires premium license - disabled for now
// import resourceTimeGridPlugin from '@fullcalendar/resource-timegrid';
import { ukLocale } from './uk-locale';

interface BookingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  resourceId?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: {
    clientName?: string;
    clientPhone?: string;
    serviceName?: string;
    status?: string;
  };
}

interface Resource {
  id: string;
  title: string;
  eventColor?: string;
}

interface BookingCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  onEventClick?: (event: BookingEvent) => void;
  onDateClick?: (date: Date) => void;
  onEventDrop?: (event: BookingEvent, newStart: Date, newEnd: Date) => void;
  onEventResize?: (event: BookingEvent, newStart: Date, newEnd: Date) => void;
  initialView?: 'timeGridDay' | 'timeGridWeek' | 'dayGridMonth' | 'resourceTimeGridDay';
  slotMinTime?: string;
  slotMaxTime?: string;
}

export function BookingCalendar({
  events = [],
  resources = [],
  onEventClick,
  onDateClick,
  onEventDrop,
  onEventResize,
  initialView = 'timeGridDay',
  slotMinTime = '08:00:00',
  slotMaxTime = '21:00:00',
}: BookingCalendarProps) {
  const [currentView, setCurrentView] = useState(initialView);

  const handleEventClick = (info: any) => {
    if (onEventClick) {
      onEventClick({
        id: info.event.id,
        title: info.event.title,
        start: info.event.startStr,
        end: info.event.endStr,
        resourceId: info.event.getResources()[0]?.id,
        extendedProps: info.event.extendedProps,
      });
    }
  };

  const handleDateClick = (info: any) => {
    if (onDateClick) {
      onDateClick(info.date);
    }
  };

  const handleEventDrop = (info: any) => {
    if (onEventDrop) {
      onEventDrop(
        {
          id: info.event.id,
          title: info.event.title,
          start: info.oldEvent.startStr,
          end: info.oldEvent.endStr,
          extendedProps: info.event.extendedProps,
        },
        info.event.start,
        info.event.end
      );
    }
  };

  const handleEventResize = (info: any) => {
    if (onEventResize) {
      onEventResize(
        {
          id: info.event.id,
          title: info.event.title,
          start: info.oldEvent.startStr,
          end: info.oldEvent.endStr,
          extendedProps: info.event.extendedProps,
        },
        info.event.start,
        info.event.end
      );
    }
  };

  // Using free plugins only (resource plugin requires premium license)
  const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin];

  return (
    <div className="fc-wrapper h-full">
      <FullCalendar
        plugins={plugins}
        initialView={currentView}
        locale={ukLocale}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth'
        }}
        buttonText={{
          today: 'Сьогодні',
          day: 'День',
          week: 'Тиждень',
          month: 'Місяць',
        }}
        events={events}
        // resources disabled - requires premium license
        editable={true}
        droppable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        nowIndicator={true}
        slotMinTime={slotMinTime}
        slotMaxTime={slotMaxTime}
        slotDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }}
        allDaySlot={false}
        height="100%"
        stickyHeaderDates={true}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        eventContent={(eventInfo) => (
          <div className="fc-event-content p-1 overflow-hidden">
            <div className="font-medium text-xs truncate">{eventInfo.event.title}</div>
            {eventInfo.event.extendedProps.clientName && (
              <div className="text-xs opacity-80 truncate">
                {eventInfo.event.extendedProps.clientName}
              </div>
            )}
          </div>
        )}
      />
    </div>
  );
}
