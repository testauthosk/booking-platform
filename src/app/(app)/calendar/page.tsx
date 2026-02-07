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
import { ClientCardPanel } from '@/components/staff/client-card-panel';
import { MasterCardPanel } from '@/components/staff/master-card-panel';
import dynamic from 'next/dynamic';
import type { CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';
import type { BookingEvent, Resource } from '@/components/calendar/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useCalendarSettings } from '@/lib/calendar-settings-context';
import { useCalendarDate } from '@/lib/calendar-date-context';
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
  const { getColorForIndex, settings, setGridStep } = useCalendarSettings();
  const { user } = useAuth();
  
  const [masters, setMasters] = useState<Master[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const { selectedDate, setSelectedDate } = useCalendarDate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [salonTimezone, setSalonTimezone] = useState<string>('Europe/Kiev');
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);
  const [settingsMenu, setSettingsMenu] = useState<{ open: boolean; x: number; y: number; startMin?: number; resourceId?: string }>({ open: false, x: 0, y: 0 });
  const [menuAnimating, setMenuAnimating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const loadBookings = async (): Promise<BookingFromAPI[]> => {
    try {
      const res = await fetch('/api/booking');
      if (res.ok) {
        const data: BookingFromAPI[] = await res.json();
        setRawBookings(data);
        return data;
      }
    } catch (error) {
      console.error('Load bookings error:', error);
    }
    return [];
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
        clientId: b.clientId || undefined,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        serviceId: b.serviceId || undefined,
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
  const [clientCardPhone, setClientCardPhone] = useState<string>('');
  const [isClientCardOpen, setIsClientCardOpen] = useState(false);
  const [selectedMasterForCard, setSelectedMasterForCard] = useState<{ id: string; name: string; email?: string; role?: string; color?: string } | null>(null);

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
      clientId: ce.clientId,
      clientName: ce.clientName,
      clientPhone: ce.clientPhone,
      serviceId: ce.serviceId,
      serviceName: ce.serviceName,
      masterName: master?.name,
      status: ce.status || 'confirmed',
      isNewClient: ce.isNewClient,
      backgroundColor: eventColors[ce.resource],
    };
  };

  // Автооновлення selectedEvent при зміні calendarEvents (після loadBookings)
  useEffect(() => {
    if (selectedEvent && isEventModalOpen) {
      const updated = calendarEvents.find(ce => ce.id === selectedEvent.id);
      if (updated) {
        setSelectedEvent(calEventToBookingEvent(updated));
      }
    }
  }, [calendarEvents]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Optimistic update — оновлюємо стан миттєво, не чекаючи API
    setRawBookings(prev => prev.map(b =>
      b.id === eventId
        ? { ...b, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration, masterId: newResourceId }
        : b
    ));

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
      // Тиха синхронізація з сервером (без візуального ефекту)
      loadBookings();
    } catch (error) {
      console.error('Failed to move booking:', error);
      // Відкат — повертаємо актуальний стан з сервера
      loadBookings();
    }
  };

  const handleEventResize = async (eventId: string, newStart: Date, newEnd: Date) => {
    const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newTimeEnd = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    // Optimistic update
    setRawBookings(prev => prev.map(b =>
      b.id === eventId
        ? { ...b, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration }
        : b
    ));

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
        })
      });
      loadBookings();
    } catch (error) {
      console.error('Failed to resize booking:', error);
      loadBookings();
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
          onEventResize={handleEventResize}
          onTimeRangeSelect={handleTimeRangeSelect}
          onEmptySlotMenu={(x, y, slotInfo) => {
            setSettingsMenu({ open: true, x, y, startMin: slotInfo?.startMin, resourceId: slotInfo?.resourceId });
            requestAnimationFrame(() => setMenuAnimating(true));
          }}
          timeStep={settings.gridStep}
          dayStartHour={8}
          dayEndHour={21}
          timezone={salonTimezone}
        />
      </div>

      {/* Контекстне меню (порожній слот) */}
      {settingsMenu.open && (
        <div className="fixed inset-0 z-[60]" onClick={() => {
          setMenuAnimating(false);
          setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 200);
        }}>
          <div
            className={`absolute bg-white border border-gray-200 rounded-xl shadow-xl p-1.5 min-w-[200px] transition-all duration-200 origin-top-left ${
              menuAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
            style={{ left: settingsMenu.x, top: settingsMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="px-3 py-2.5 text-sm font-medium hover:bg-gray-50 rounded-lg w-full text-left flex items-center gap-2.5 transition-colors"
              onClick={() => {
                setMenuAnimating(false);
                setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 150);
                // Створюємо слот з позиції кліку
                const startMin = settingsMenu.startMin ?? 10 * 60;
                const h = Math.floor(startMin / 60);
                const m = startMin % 60;
                const slotStart = new Date(selectedDate);
                slotStart.setHours(h, m, 0, 0);
                const slotEnd = new Date(slotStart.getTime() + 60 * 60000);
                setSelectedSlot({ start: slotStart, end: slotEnd, resourceId: settingsMenu.resourceId || resources[0]?.id || '' });
                setIsNewBookingModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4 text-gray-500" />
              Додати запис
            </button>
            <button
              className="px-3 py-2.5 text-sm font-medium hover:bg-gray-50 rounded-lg w-full text-left flex items-center gap-2.5 transition-colors"
              onClick={() => {
                setMenuAnimating(false);
                setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 150);
                setSettingsOpen(true);
              }}
            >
              <CalendarIcon className="h-4 w-4 text-gray-500" />
              Налаштування календаря
            </button>
          </div>
        </div>
      )}

      {/* Sidebar налаштувань календаря */}
      <div className={`fixed inset-y-0 right-0 w-[300px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold">Налаштування</h3>
          <button className="h-8 w-8 rounded-lg hover:bg-gray-100" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Сітка часу</div>
          <div className="flex gap-2">
            {[5, 15, 30].map((s) => (
              <button
                key={s}
                onClick={() => setGridStep(s as 5 | 15 | 30)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${settings.gridStep === s ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-200'}`}
              >
                {s} хв
              </button>
            ))}
          </div>
        </div>
      </div>
      {settingsOpen && <div className="fixed inset-0 bg-black/20 z-[65]" onClick={() => setSettingsOpen(false)} />}

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
        isEditOpen={isEditModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onEdit={() => { setIsEditModalOpen(true); }}
        onDelete={handleDeleteEvent}
        onOpenClient={(clientId, clientPhone) => {
          setClientCardPhone(clientPhone || selectedEvent?.clientPhone || '');
          setIsClientCardOpen(true);
        }}
        onOpenMaster={(masterId) => {
          const m = masters.find(m => m.id === masterId);
          if (m) setSelectedMasterForCard({ id: m.id, name: m.name, email: m.email, role: m.role, color: m.color });
        }}
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
        onClose={() => { setIsEditModalOpen(false); }}
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
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `Помилка ${res.status}`);
          }
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

      {/* Client Card Sidebar */}
      <ClientCardPanel
        isOpen={isClientCardOpen}
        onClose={() => setIsClientCardOpen(false)}
        clientPhone={clientCardPhone}
        clientName={selectedEvent?.clientName || ''}
        masterId={selectedEvent?.resourceId || ''}
        salonId={user?.salonId || ''}
        editable
      />

      {/* Master Card — same as /team */}
      <MasterCardPanel
        isOpen={!!selectedMasterForCard}
        onClose={() => setSelectedMasterForCard(null)}
        master={selectedMasterForCard}
      />
    </div>
  );
}
