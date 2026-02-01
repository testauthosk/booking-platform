'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, Plus } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { BookingCalendar, BookingEvent, Resource } from '@/components/calendar/booking-calendar';
import { EventModal } from '@/components/calendar/event-modal';
import { NewBookingModal } from '@/components/calendar/new-booking-modal';
import '@/components/calendar/calendar-styles.css';

// Demo resources (team members)
const demoResources: Resource[] = [
  { id: '1', title: "Don't Pursue", color: '#f97316' },
  { id: '2', title: 'Wendy Smith', color: '#ec4899' },
];

// Demo events
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const initialEvents: BookingEvent[] = [
  {
    id: '1',
    title: 'Стрижка',
    start: new Date(`${todayStr}T10:00:00`),
    end: new Date(`${todayStr}T11:00:00`),
    resourceId: '1',
    backgroundColor: '#f97316',
    clientName: 'John Doe',
    clientPhone: '+380 99 123 4567',
    serviceName: 'Стрижка',
    masterName: "Don't Pursue",
    status: 'confirmed',
  },
  {
    id: '2',
    title: 'Фарбування',
    start: new Date(`${todayStr}T14:00:00`),
    end: new Date(`${todayStr}T16:30:00`),
    resourceId: '2',
    backgroundColor: '#ec4899',
    clientName: 'Jane Smith',
    clientPhone: '+380 67 234 5678',
    serviceName: 'Фарбування волосся',
    masterName: 'Wendy Smith',
    status: 'confirmed',
  },
  {
    id: '3',
    title: 'Манікюр',
    start: new Date(`${todayStr}T11:30:00`),
    end: new Date(`${todayStr}T12:30:00`),
    resourceId: '1',
    backgroundColor: '#8b5cf6',
    clientName: 'Alex Brown',
    clientPhone: '+380 50 345 6789',
    serviceName: 'Манікюр',
    masterName: "Don't Pursue",
    status: 'pending',
  },
];

const eventColors: Record<string, string> = {
  '1': '#f97316', // Don't Pursue - orange
  '2': '#ec4899', // Wendy Smith - pink
};

export default function CalendarPage() {
  const { open: openSidebar } = useSidebar();
  const [events, setEvents] = useState(initialEvents);
  
  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);

  const handleEventClick = (event: BookingEvent) => {
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleSlotClick = (slotInfo: { start: Date; end: Date; resourceId?: string }) => {
    setSelectedSlot(slotInfo);
    setIsNewBookingModalOpen(true);
  };

  const handleEventDrop = (event: BookingEvent, start: Date, end: Date, resourceId?: string) => {
    setEvents(prev => prev.map(e => 
      e.id === event.id 
        ? { 
            ...e, 
            start, 
            end, 
            resourceId: resourceId || e.resourceId,
            backgroundColor: eventColors[resourceId || e.resourceId || '1'],
            masterName: demoResources.find(r => r.id === (resourceId || e.resourceId))?.title,
          }
        : e
    ));
  };

  const handleNewBooking = (booking: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    start: Date;
    end: Date;
    resourceId: string;
  }) => {
    const newEvent: BookingEvent = {
      id: Date.now().toString(),
      title: booking.serviceName,
      start: booking.start,
      end: booking.end,
      resourceId: booking.resourceId,
      backgroundColor: eventColors[booking.resourceId] || '#8b5cf6',
      clientName: booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.serviceName,
      masterName: demoResources.find(r => r.id === booking.resourceId)?.title,
      status: 'confirmed',
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const handleDeleteEvent = (event: BookingEvent) => {
    setEvents(prev => prev.filter(e => e.id !== event.id));
    setIsEventModalOpen(false);
  };

  const handleFabClick = () => {
    // Open new booking modal with current time
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    const end = new Date(now.getTime() + 60 * 60000);
    setSelectedSlot({ start: now, end, resourceId: '1' });
    setIsNewBookingModalOpen(true);
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
      <div className="flex-1 overflow-hidden p-2 lg:p-4">
        <BookingCalendar
          events={events}
          resources={demoResources}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
          onEventDrop={handleEventDrop}
          defaultView="day"
        />
      </div>

      {/* Mobile FAB - Add booking */}
      <Button 
        className="lg:hidden fixed right-4 bottom-24 w-14 h-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 z-30"
        size="icon"
        onClick={handleFabClick}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Event details modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEdit={(event) => {
          console.log('Edit event:', event);
          setIsEventModalOpen(false);
        }}
        onDelete={handleDeleteEvent}
      />

      {/* New booking modal */}
      <NewBookingModal
        isOpen={isNewBookingModalOpen}
        onClose={() => setIsNewBookingModalOpen(false)}
        onSave={handleNewBooking}
        slotInfo={selectedSlot}
        resources={demoResources}
      />
    </div>
  );
}
