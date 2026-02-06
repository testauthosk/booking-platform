// @ts-nocheck
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSidebar } from '@/components/sidebar-context';
import { EventModal } from '@/components/calendar/event-modal';
import { NewBookingModal } from '@/components/calendar/new-booking-modal';
import { BlockTimeModal } from '@/components/calendar/block-time-modal';
import { EditBookingModal } from '@/components/calendar/edit-booking-modal';
import { ColleagueBookingModal } from '@/components/staff/colleague-booking-modal';
import dynamic from 'next/dynamic';
import type { CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';
import type { BookingEvent, Resource } from '@/components/calendar/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCalendarSettings } from '@/lib/calendar-settings-context';
import { useAuth } from '@/contexts/AuthContext';

// Dynamic import — DayPilot потребує window
const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { 
    ssr: false, 
    loading: () => <div className="flex-1 flex items-center justify-center"><div className="text-gray-400">Завантаження...</div></div> 
  }
);

interface WorkingDay {
  start: string;
  end: string;
  enabled: boolean;
}

interface WorkingHours {
  monday?: WorkingDay;
  tuesday?: WorkingDay;
  wednesday?: WorkingDay;
  thursday?: WorkingDay;
  friday?: WorkingDay;
  saturday?: WorkingDay;
  sunday?: WorkingDay;
}

interface Master {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  color?: string;
  workingHours?: WorkingHours;
}

interface SalonData {
  id: string;
  timezone: string;
  address?: string;
}

interface BookingFromAPI {
  id: string;
  masterId: string | null;
  clientId: string | null;
  serviceId: string | null;
  clientName: string;
  clientPhone: string;
  serviceName: string | null;
  masterName: string | null;
  date: string;
  time: string;
  timeEnd: string | null;
  duration: number;
  status: string;
  isNewClient?: boolean;
}

// Украинские названия
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
  const { user } = useAuth();
  
  const [masters, setMasters] = useState<Master[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [salonTimezone, setSalonTimezone] = useState<string>('Europe/Kiev');
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);

  // Load data from API
  useEffect(() => {
    if (user?.salonId) {
      loadMasters();
      loadSalon();
      loadBookings();
      loadServices();
    }
  }, [user?.salonId]);

  const loadMasters = async () => {
    try {
      const res = await fetch(`/api/masters?salonId=${user?.salonId}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data);
      }
    } catch (error) {
      console.error('Load masters error:', error);
    } finally {
      setLoadingMasters(false);
    }
  };

  const loadSalon = async () => {
    try {
      const res = await fetch(`/api/salon?salonId=${user?.salonId}`);
      if (res.ok) {
        const data: SalonData = await res.json();
        if (data.timezone) setSalonTimezone(data.timezone);
      }
    } catch (error) {
      console.error('Load salon error:', error);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch(`/api/services?salonId=${user?.salonId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Load services error:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/booking');
      if (res.ok) {
        const data: BookingFromAPI[] = await res.json();
        setRawBookings(data);
      }
    } catch (error) {
      console.error('Load bookings error:', error);
    }
  };

  // Resources для DayPilot
  const calendarResources: CalendarResource[] = useMemo(() =>
    masters.map((m, idx) => ({
      id: m.id,
      name: m.name,
      avatar: m.avatar,
      color: m.color || getColorForIndex(idx),
    })),
    [masters, settings.paletteId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Events для DayPilot (конвертуємо з API формату)
  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return rawBookings.map(b => {
      const [year, month, day] = b.date.split('-').map(Number);
      const [startHour, startMin] = b.time.split(':').map(Number);
      
      let endHour: number, endMin: number;
      if (b.timeEnd) {
        [endHour, endMin] = b.timeEnd.split(':').map(Number);
      } else {
        const endDate = new Date(year, month - 1, day, startHour, startMin);
        endDate.setMinutes(endDate.getMinutes() + b.duration);
        endHour = endDate.getHours();
        endMin = endDate.getMinutes();
      }

      const dateStr = b.date;
      const startStr = `${dateStr}T${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}:00`;
      const endStr = `${dateStr}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

      return {
        id: b.id,
        text: b.serviceName || 'Запис',
        start: startStr,
        end: endStr,
        resource: b.masterId || '',
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        serviceName: b.serviceName || undefined,
        isNewClient: b.isNewClient || false,
        status: b.status?.toLowerCase(),
      };
    });
  }, [rawBookings]);

  // Color mapping для BookingEvent (для модалок)
  const eventColors: Record<string, string> = useMemo(() => {
    const colors: Record<string, string> = {};
    masters.forEach((master, idx) => {
      colors[master.id] = master.color || getColorForIndex(idx);
    });
    return colors;
  }, [masters, settings.paletteId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resources у форматі CustomCalendar (для модалок)
  const resources: Resource[] = useMemo(() =>
    masters.map((master, idx) => ({
      id: master.id,
      title: master.name,
      avatar: master.avatar,
      color: master.color || getColorForIndex(idx),
      workingHours: master.workingHours,
    })),
    [masters, settings.paletteId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Desktop navigation
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
  const goToToday = () => setSelectedDate(new Date());
  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Modal states
  const [selectedEvent, setSelectedEvent] = useState<BookingEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isNewBookingModalOpen, setIsNewBookingModalOpen] = useState(false);
  const [isBlockTimeModalOpen, setIsBlockTimeModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isColleagueBookingOpen, setIsColleagueBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; resourceId?: string } | null>(null);

  // Конвертуємо CalendarEvent → BookingEvent для модалок
  const calEventToBookingEvent = (ce: CalendarEvent): BookingEvent => {
    const start = new Date(ce.start);
    const end = new Date(ce.end);
    const master = masters.find(m => m.id === ce.resource);
    return {
      id: ce.id,
      title: ce.serviceName || ce.text,
      start,
      end,
      resourceId: ce.resource,
      clientName: ce.clientName,
      clientPhone: ce.clientPhone,
      serviceName: ce.serviceName,
      masterName: master?.name,
      status: ce.status || 'confirmed',
      isNewClient: ce.isNewClient,
      backgroundColor: eventColors[ce.resource],
      type: 'booking',
    };
  };

  // Callbacks для DayPilot
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(calEventToBookingEvent(event));
    setIsEventModalOpen(true);
  };

  const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => {
    const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newTimeEnd = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    try {
      await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: eventId,
          date: newDate,
          time: newTime,
          timeEnd: newTimeEnd,
          duration: newDuration,
          masterId: newResourceId,
        })
      });
      await loadBookings();
    } catch (error) {
      console.error('Failed to move booking:', error);
      await loadBookings();
    }
  };

  const handleTimeRangeSelect = (start: Date, end: Date, resourceId: string) => {
    setSelectedSlot({ start, end, resourceId });
    setIsNewBookingModalOpen(true);
  };

  const handleDeleteEvent = async (event: BookingEvent) => {
    try {
      await fetch(`/api/bookings/${event.id}`, { method: 'DELETE' });
      await loadBookings();
    } catch (error) {
      console.error('Delete error:', error);
    }
    setIsEventModalOpen(false);
  };

  const handleNewBooking = async (booking: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    start: Date;
    end: Date;
    resourceId: string;
  }) => {
    // Модалка сама робить POST, просто перезавантажуємо
    await loadBookings();
  };

  const handleFabClick = () => {
    const now = new Date();
    now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
    const end = new Date(now.getTime() + 60 * 60000);
    setSelectedSlot({ start: now, end, resourceId: resources[0]?.id || '1' });
    setIsNewBookingModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile header */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0 z-20">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl border border-gray-200"
          onClick={openSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900">Календар</h1>
        <div className="flex items-center gap-2">
          {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl border border-gray-200"
              onClick={() => setIsColleagueBookingOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          )}
          <NotificationBell />
          <div className="h-9 w-9 rounded-xl bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
            D
          </div>
        </div>
      </header>

      {/* Desktop date navigation */}
      <div className="hidden lg:flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant={isToday ? "default" : "outline"} size="sm" className="h-8 px-3" onClick={goToToday}>
            Сьогодні
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-medium text-sm gap-2 h-9 px-3 border-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="capitalize">{formatDateUk(selectedDate)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => { if (date) { setSelectedDate(date); setIsCalendarOpen(false); }}}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Calendar */}
      <div className="flex-1 overflow-hidden">
        <DayPilotResourceCalendar
          resources={calendarResources}
          events={calendarEvents}
          startDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          onEventMove={handleEventMove}
          onTimeRangeSelect={handleTimeRangeSelect}
          dayStartHour={8}
          dayEndHour={21}
        />
      </div>

      {/* Mobile FAB */}
      <Button
        className="lg:hidden fixed right-2 bottom-[108px] w-14 h-14 rounded-2xl shadow-lg z-50 bg-gray-900 hover:bg-gray-800"
        size="icon"
        onClick={handleFabClick}
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Event details modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEdit={() => { setIsEventModalOpen(false); setIsEditModalOpen(true); }}
        onDelete={handleDeleteEvent}
        onExtend={async (event, minutes) => {
          try {
            const currentDuration = Math.round((event.end.getTime() - event.start.getTime()) / 60000);
            await fetch(`/api/bookings/${event.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                extraTime: ((event as any).extraTime || 0) + minutes,
                duration: currentDuration + minutes,
              }),
            });
            await loadBookings();
            setIsEventModalOpen(false);
          } catch (error) {
            console.error('Extend error:', error);
          }
        }}
      />

      {/* New booking modal */}
      <NewBookingModal
        isOpen={isNewBookingModalOpen}
        onClose={() => setIsNewBookingModalOpen(false)}
        onSave={handleNewBooking}
        slotInfo={selectedSlot}
        resources={resources}
      />

      {/* Block Time Modal */}
      {selectedSlot && (
        <BlockTimeModal
          isOpen={isBlockTimeModalOpen}
          onClose={() => setIsBlockTimeModalOpen(false)}
          date={selectedSlot.start}
          time={`${selectedSlot.start.getHours().toString().padStart(2, '0')}:${selectedSlot.start.getMinutes().toString().padStart(2, '0')}`}
          masterId={selectedSlot.resourceId}
          masterName={resources.find(r => r.id === selectedSlot.resourceId)?.title}
          salonId={user?.salonId || ''}
          onSave={loadBookings}
        />
      )}

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        booking={selectedEvent ? {
          id: selectedEvent.id,
          clientId: selectedEvent.clientId,
          clientName: selectedEvent.clientName,
          clientPhone: selectedEvent.clientPhone,
          serviceId: selectedEvent.serviceId,
          serviceName: selectedEvent.serviceName,
          date: selectedEvent.start.toISOString().split('T')[0],
          time: `${selectedEvent.start.getHours().toString().padStart(2, '0')}:${selectedEvent.start.getMinutes().toString().padStart(2, '0')}`,
          duration: Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / 60000),
          extraTime: (selectedEvent as any).extraTime || 0,
          masterId: selectedEvent.resourceId,
        } : null}
        services={services}
        salonId={user?.salonId || ''}
        onSave={async (data) => {
          const res = await fetch(`/api/bookings/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
          if (!res.ok) throw new Error('Failed to update');
          await loadBookings();
        }}
      />

      {/* Colleague Booking Modal */}
      {(user?.role === 'OWNER' || user?.role === 'ADMIN') && user?.salonId && (
        <ColleagueBookingModal
          isOpen={isColleagueBookingOpen}
          onClose={() => setIsColleagueBookingOpen(false)}
          salonId={user.salonId}
          currentMasterId={null}
          onSuccess={loadBookings}
        />
      )}
    </div>
  );
}
