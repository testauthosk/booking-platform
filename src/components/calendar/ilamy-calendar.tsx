'use client';

import { useState } from 'react';
import { IlamyResourceCalendar } from '@ilamy/calendar';
import type { Resource, CalendarEvent, CellClickInfo } from '@ilamy/calendar';
import dayjs from 'dayjs';

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

export interface MasterResource {
  id: string;
  title: string;
  color?: string;
}

interface IlamyBookingCalendarProps {
  events?: BookingEvent[];
  resources?: MasterResource[];
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onEventDrop?: (event: BookingEvent, start: Date, end: Date, resourceId?: string) => void;
}

export function IlamyBookingCalendar({
  events = [],
  resources = [],
  onEventClick,
  onSlotClick,
  onEventDrop,
}: IlamyBookingCalendarProps) {
  // Convert resources to ilamy format (ensure string IDs)
  const ilamyResources: Resource[] = resources.map((r) => ({
    id: String(r.id),
    title: r.title,
    color: r.color || '#4eb8d5',
    backgroundColor: r.color ? `${r.color}20` : '#4eb8d520',
  }));

  // Convert events to ilamy format (ensure matching resourceId)
  const ilamyEvents: CalendarEvent[] = events.map((e) => ({
    id: String(e.id),
    title: `${e.clientName || ''} - ${e.title}`,
    start: dayjs(e.start),
    end: dayjs(e.end),
    uid: `event-${e.id}@booking`,
    resourceId: String(e.resourceId),
    backgroundColor: e.backgroundColor || '#4eb8d5',
    color: '#ffffff',
    // Store original data
    extendedProps: { originalEvent: e },
  }));

  const handleCellClick = (info: CellClickInfo) => {
    if (onSlotClick) {
      onSlotClick({
        start: info.start.toDate(),
        end: info.end.toDate(),
        resourceId: info.resourceId as string | undefined,
      });
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick && event.extendedProps?.originalEvent) {
      onEventClick(event.extendedProps.originalEvent as BookingEvent);
    }
  };

  const handleEventUpdate = (event: CalendarEvent) => {
    if (onEventDrop && event.extendedProps?.originalEvent) {
      onEventDrop(
        event.extendedProps.originalEvent as BookingEvent,
        event.start.toDate(),
        event.end.toDate(),
        event.resourceId as string | undefined
      );
    }
  };

  return (
    <div className="h-full w-full ilamy-booking-calendar">
      <style jsx global>{`
        .ilamy-booking-calendar {
          --ilamy-primary: #4eb8d5;
          --ilamy-current-time: #ef4444;
        }
        
        .ilamy-booking-calendar .ilamy-calendar {
          height: 100% !important;
          font-family: inherit !important;
        }
        
        /* Current time indicator */
        .ilamy-booking-calendar [data-current-time-indicator] {
          background-color: #ef4444 !important;
        }
      `}</style>

      <IlamyResourceCalendar
        resources={ilamyResources}
        events={ilamyEvents}
        initialView="day"
        orientation="vertical"
        timeFormat="24-hour"
        firstDayOfWeek="monday"
        locale="uk"
        businessHours={{
          daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          startTime: 8,
          endTime: 21,
        }}
        hideNonBusinessHours={true}
        disableDragAndDrop={false}
        onCellClick={handleCellClick}
        onEventClick={handleEventClick}
        onEventUpdate={handleEventUpdate}
      />
    </div>
  );
}
