'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Bell, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { EventModal } from '@/components/calendar/event-modal';
import { NewBookingModal } from '@/components/calendar/new-booking-modal';
import { CustomCalendar, type BookingEvent, type Resource } from '@/components/calendar/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCalendarSettings } from '@/lib/calendar-settings-context';

// Demo team members (colors will be assigned from palette)
const demoTeamMembers = [
  { id: '1', title: "Don't Pursue" },
  { id: '2', title: 'Wendy Smith' },
  { id: '3', title: 'Anna Johnson' },
  { id: '4', title: 'Mike Brown' },
  { id: '5', title: 'Sarah Davis' },
];

// Demo events (colors will be assigned dynamically from palette)
const today = new Date();
const todayStr = today.toISOString().split('T')[0];

const createInitialEvents = (getColor: (idx: number) => string): BookingEvent[] => [
  {
    id: '1',
    title: 'Стрижка',
    start: new Date(`${todayStr}T10:00:00`),
    end: new Date(`${todayStr}T11:00:00`),
    resourceId: '1',
    backgroundColor: getColor(0),
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
    backgroundColor: getColor(1),
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
    backgroundColor: getColor(0),
    clientName: 'Alex Brown',
    clientPhone: '+380 50 345 6789',
    serviceName: 'Манікюр',
    masterName: "Don't Pursue",
    status: 'pending',
  },
  {
    id: '4',
    title: 'Укладка',
    start: new Date(`${todayStr}T09:00:00`),
    end: new Date(`${todayStr}T10:00:00`),
    resourceId: '3',
    backgroundColor: getColor(2),
    clientName: 'Maria Wilson',
    clientPhone: '+380 63 456 7890',
    serviceName: 'Укладка',
    masterName: 'Anna Johnson',
    status: 'confirmed',
  },
  {
    id: '5',
    title: 'Масаж',
    start: new Date(`${todayStr}T13:00:00`),
    end: new Date(`${todayStr}T14:30:00`),
    resourceId: '4',
    backgroundColor: getColor(3),
    clientName: 'Peter Parker',
    clientPhone: '+380 95 567 8901',
    serviceName: 'Масаж спини',
    masterName: 'Mike Brown',
    status: 'confirmed',
  },
  {
    id: '6',
    title: 'Педікюр',
    start: new Date(`${todayStr}T15:00:00`),
    end: new Date(`${todayStr}T16:30:00`),
    resourceId: '5',
    backgroundColor: getColor(4),
    clientName: 'Emma Stone',
    clientPhone: '+380 66 678 9012',
    serviceName: 'Педікюр',
    masterName: 'Sarah Davis',
    status: 'confirmed',
  },
];

// Украинские названия дней и месяцев
const ukDays = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
const ukMonths = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

const formatDateUk = (date: Date) => {
  const day = ukDays[date.getDay()];
  const dayNum = date.getDate();
  const month = ukMonths[date.getMonth()];
  return `${day}, ${dayNum} ${month}`;
};

export default function CalendarPage() {
  const { open: openSidebar } = useSidebar();
  const { getColorForIndex, settings } = useCalendarSettings();
  
  // Create resources with colors from palette
  const demoResources: Resource[] = useMemo(() => 
    demoTeamMembers.map((member, idx) => ({
      ...member,
      color: getColorForIndex(idx),
    })),
    [settings.paletteId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Create color mapping for resources
  const eventColors: Record<string, string> = useMemo(() => {
    const colors: Record<string, string> = {};
    demoTeamMembers.forEach((member, idx) => {
      colors[member.id] = getColorForIndex(idx);
    });
    return colors;
  }, [settings.paletteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [events, setEvents] = useState<BookingEvent[]>(() => createInitialEvents(getColorForIndex));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Update event colors when palette changes
  useMemo(() => {
    setEvents(prev => prev.map(e => ({
      ...e,
      backgroundColor: eventColors[e.resourceId || '1'] || getColorForIndex(0),
    })));
  }, [settings.paletteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Навигация по датам
  const goToPrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const goToNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  
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
    <div className="flex flex-col h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)] bg-background overflow-hidden overscroll-none">
      {/* Mobile header - fixed */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-background shrink-0 z-20 touch-none">
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

      {/* Date Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
        {/* Left side: < Сьогодні > */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button 
            variant={isToday ? "default" : "outline"} 
            size="sm" 
            className="h-8 px-3"
            onClick={goToToday}
          >
            Сьогодні
          </Button>
          
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side: Date button with calendar */}
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              className="font-medium text-sm gap-2 h-9 px-3 border-2"
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="capitalize">{formatDateUk(selectedDate)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setIsCalendarOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <CustomCalendar
          events={events.filter(e => {
            const eventDate = e.start.toDateString();
            return eventDate === selectedDate.toDateString();
          })}
          resources={demoResources}
          selectedDate={selectedDate}
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
          dayStart={8}
          dayEnd={21}
          slotDuration={10}
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
