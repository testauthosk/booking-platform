'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, Plus } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { BookingCalendar } from '@/components/calendar/booking-calendar';
import '@/components/calendar/calendar-styles.css';

// Demo data
const demoEvents = [
  {
    id: '1',
    title: 'Стрижка',
    start: new Date().toISOString().split('T')[0] + 'T10:00:00',
    end: new Date().toISOString().split('T')[0] + 'T11:00:00',
    backgroundColor: '#f97316',
    extendedProps: {
      clientName: 'John Doe',
      clientPhone: '+380 99 123 4567',
      serviceName: 'Стрижка',
      masterName: "Don't Pursue",
      status: 'confirmed',
    },
  },
  {
    id: '2',
    title: 'Фарбування',
    start: new Date().toISOString().split('T')[0] + 'T14:00:00',
    end: new Date().toISOString().split('T')[0] + 'T16:30:00',
    backgroundColor: '#ec4899',
    extendedProps: {
      clientName: 'Jane Smith',
      clientPhone: '+380 67 234 5678',
      serviceName: 'Фарбування волосся',
      masterName: 'Wendy Smith',
      status: 'confirmed',
    },
  },
  {
    id: '3',
    title: 'Манікюр',
    start: new Date().toISOString().split('T')[0] + 'T11:30:00',
    end: new Date().toISOString().split('T')[0] + 'T12:30:00',
    backgroundColor: '#8b5cf6',
    extendedProps: {
      clientName: 'Alex Brown',
      clientPhone: '+380 50 345 6789',
      serviceName: 'Манікюр',
      masterName: "Don't Pursue",
      status: 'pending',
    },
  },
];

// Resources disabled - requires premium FullCalendar license
// const demoResources = [
//   { id: '1', title: "Don't Pursue", eventColor: '#f97316' },
//   { id: '2', title: 'Wendy Smith', eventColor: '#ec4899' },
// ];

export default function CalendarPage() {
  const { open: openSidebar } = useSidebar();
  const [events, setEvents] = useState(demoEvents);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    // TODO: Open event details modal
    console.log('Event clicked:', event);
  };

  const handleDateClick = (date: Date) => {
    // TODO: Open new booking modal
    console.log('Date clicked:', date);
  };

  const handleEventDrop = (event: any, newStart: Date, newEnd: Date) => {
    // Update event in state
    setEvents(prev => prev.map(e => 
      e.id === event.id 
        ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() }
        : e
    ));
    console.log('Event moved:', event.id, 'to', newStart);
  };

  const handleEventResize = (event: any, newStart: Date, newEnd: Date) => {
    // Update event in state
    setEvents(prev => prev.map(e => 
      e.id === event.id 
        ? { ...e, start: newStart.toISOString(), end: newEnd.toISOString() }
        : e
    ));
    console.log('Event resized:', event.id);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 transition-transform active:scale-95" 
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <h1 className="text-base font-semibold">Календар</h1>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9 relative transition-transform active:scale-95">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>
          <div className="h-8 w-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-medium">
            D
          </div>
        </div>
      </header>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <BookingCalendar
          events={events}
          onEventClick={handleEventClick}
          onDateClick={handleDateClick}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          initialView="timeGridDay"
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
        />
      </div>

      {/* Mobile FAB - Add booking */}
      <Button 
        className="lg:hidden fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 z-30"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
