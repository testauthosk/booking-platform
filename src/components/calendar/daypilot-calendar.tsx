'use client';

import React, { useState, useEffect, useRef } from 'react';
import { DayPilot, DayPilotCalendar } from '@daypilot/daypilot-lite-react';

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

interface DayPilotBookingCalendarProps {
  events?: BookingEvent[];
  resources?: Resource[];
  onEventClick?: (event: BookingEvent) => void;
  onSlotClick?: (slotInfo: { start: Date; end: Date; resourceId?: string }) => void;
  onEventDrop?: (event: BookingEvent, start: Date, end: Date, resourceId?: string) => void;
}

export function DayPilotBookingCalendar({
  events = [],
  resources = [],
  onEventClick,
  onSlotClick,
  onEventDrop,
}: DayPilotBookingCalendarProps) {
  const calendarRef = useRef<any>(null);
  const [startDate, setStartDate] = useState(DayPilot.Date.today());

  // Convert resources to DayPilot format
  const columns = resources.map(r => ({
    name: r.title,
    id: r.id,
  }));

  // Convert events to DayPilot format
  const dpEvents = events.map(e => ({
    id: e.id,
    text: e.title,
    start: e.start.toISOString(),
    end: e.end.toISOString(),
    resource: e.resourceId,
    backColor: e.backgroundColor || '#4eb8d5',
    // Store original event data
    data: e,
  }));

  const config = {
    viewType: 'Resources',
    headerHeight: 50,
    cellHeight: 30,
    cellDuration: 30,
    dayBeginsHour: 8,
    dayEndsHour: 21,
    timeRangeSelectedHandling: 'Enabled',
    eventMoveHandling: 'Update',
    eventResizeHandling: 'Update',
    eventClickHandling: 'Enabled',
    // Current time indicator
    showCurrentTime: true,
    showCurrentTimeMode: 'Full',
    // Styling
    eventBorderRadius: '6px',
    columnMarginRight: 1,
  };

  const handleTimeRangeSelected = (args: any) => {
    if (onSlotClick) {
      onSlotClick({
        start: args.start.toDate(),
        end: args.end.toDate(),
        resourceId: args.resource,
      });
    }
    // Clear selection
    if (calendarRef.current?.control) {
      calendarRef.current.control.clearSelection();
    }
  };

  const handleEventClick = (args: any) => {
    if (onEventClick && args.e.data.data) {
      onEventClick(args.e.data.data);
    }
  };

  const handleEventMove = (args: any) => {
    if (onEventDrop && args.e.data.data) {
      onEventDrop(
        args.e.data.data,
        args.newStart.toDate(),
        args.newEnd.toDate(),
        args.newResource
      );
    }
  };

  const handleEventResize = (args: any) => {
    if (onEventDrop && args.e.data.data) {
      onEventDrop(
        args.e.data.data,
        args.newStart.toDate(),
        args.newEnd.toDate(),
        args.e.data.resource
      );
    }
  };

  // Custom event rendering
  const onBeforeEventRender = (args: any) => {
    const event = args.e.data.data as BookingEvent;
    if (event) {
      const startTime = event.start.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      const endTime = event.end.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
      
      args.e.html = `
        <div style="padding: 4px 6px; font-size: 12px; height: 100%; overflow: hidden;">
          <div style="font-size: 11px; opacity: 0.9;">
            ${startTime} - ${endTime} <strong>${event.clientName || ''}</strong>
          </div>
          <div style="margin-top: 2px;">${event.title}</div>
        </div>
      `;
    }
  };

  return (
    <div className="h-full daypilot-calendar">
      <style jsx global>{`
        .daypilot-calendar {
          --dp-border-color: hsl(var(--border));
          --dp-cell-color: hsl(var(--background));
        }
        
        .calendar_default_main {
          border: 1px solid var(--dp-border-color) !important;
          border-radius: 8px !important;
          overflow: hidden;
          font-family: inherit !important;
        }
        
        .calendar_default_colheader,
        .calendar_default_colheader_inner {
          background: hsl(var(--background)) !important;
          border-color: var(--dp-border-color) !important;
          font-weight: 600 !important;
          font-size: 13px !important;
        }
        
        .calendar_default_rowheader,
        .calendar_default_rowheader_inner {
          background: hsl(var(--background) / 0.7) !important;
          backdrop-filter: blur(8px);
          border-color: var(--dp-border-color) !important;
          font-size: 11px !important;
          color: hsl(var(--muted-foreground)) !important;
        }
        
        .calendar_default_cell {
          border-color: var(--dp-border-color) !important;
        }
        
        .calendar_default_cell_inner {
          background: hsl(var(--background)) !important;
        }
        
        .calendar_default_event {
          border-radius: 6px !important;
          border: none !important;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15) !important;
        }
        
        .calendar_default_event_inner {
          border-radius: 6px !important;
          border: none !important;
          color: white !important;
        }
        
        /* Current time indicator */
        .calendar_default_now {
          background: #ef4444 !important;
        }
        
        .calendar_default_now_label {
          background: #ef4444 !important;
          color: white !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
          font-size: 11px !important;
          font-weight: 500 !important;
        }
      `}</style>
      
      <DayPilotCalendar
        ref={calendarRef}
        {...config}
        startDate={startDate}
        columns={columns}
        events={dpEvents}
        onTimeRangeSelected={handleTimeRangeSelected}
        onEventClick={handleEventClick}
        onEventMove={handleEventMove}
        onEventResize={handleEventResize}
        onBeforeEventRender={onBeforeEventRender}
      />
    </div>
  );
}
