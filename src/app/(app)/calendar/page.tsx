// @ts-nocheck
'use client';

import { useState, useMemo, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
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
import { MobileCalendarPicker } from '@/components/calendar/mobile-calendar-picker';
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
  workingHours?: WorkingHours;
}

interface UndoAction {
  type: 'move' | 'resize';
  bookingId: string;
  previousData: Partial<BookingFromAPI>;
  message: string;
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

function ViewModeSegment({ viewMode, onChange }: { viewMode: 'day' | 'week'; onChange: (v: 'day' | 'week') => void }) {
  return (
    <div
      className="relative"
      style={{
        flex: 1,
        height: '44px',
        padding: '3px',
        borderRadius: '12px',
        backgroundColor: '#f3f4f6',
        border: '1px solid rgba(0,0,0,0.4)',
      }}
    >
      <div className="relative flex items-center" style={{ height: '100%' }}>
        {/* White sliding pill */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '0',
            bottom: '0',
            width: '50%',
            left: 0,
            transform: viewMode === 'day' ? 'translateX(0%)' : 'translateX(100%)',
            transition: 'transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            padding: '0',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '9px',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.04)',
            }}
          />
        </div>
        {/* Buttons — equal width */}
        <button
          className="inline-btn relative z-10 flex items-center justify-center whitespace-nowrap"
          style={{ width: '50%', height: '100%', fontSize: '13px', fontWeight: 600, color: viewMode === 'day' ? '#111827' : '#6b7280', transition: 'color 200ms' }}
          onClick={() => onChange('day')}
        >
          День
        </button>
        <button
          className="inline-btn relative z-10 flex items-center justify-center whitespace-nowrap"
          style={{ width: '50%', height: '100%', fontSize: '13px', fontWeight: 600, color: viewMode === 'week' ? '#111827' : '#6b7280', transition: 'color 200ms' }}
          onClick={() => onChange('week')}
        >
          Тиждень
        </button>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { open: openSidebar } = useSidebar();
  const { getColorForIndex, settings, setGridStep, setPaletteId } = useCalendarSettings();
  const { user } = useAuth();
  
  const [masters, setMasters] = useState<Master[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(true);
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const { selectedDate, setSelectedDate } = useCalendarDate();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isMobileCalendarOpen, setIsMobileCalendarOpen] = useState(false);
  const [salonTimezone, setSalonTimezone] = useState<string>('Europe/Kiev');
  const [salonWorkingHours, setSalonWorkingHours] = useState<WorkingHours | null>(null);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [weekFilterMasterIds, setWeekFilterMasterIds] = useState<string[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);
  const [settingsMenu, setSettingsMenu] = useState<{
    open: boolean; x: number; y: number;
    startMin?: number; resourceId?: string;
    resourceName?: string; dateLabel?: string;
    selectedMin?: number; masterColor?: string;
    cellRect?: { top: number; left: number; width: number; height: number };
    scrollEl?: HTMLElement;
  }>({ open: false, x: 0, y: 0 });
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
        if (data.workingHours) setSalonWorkingHours(data.workingHours);
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
      // Load ±2 weeks from selected date for smooth navigation
      const from = new Date(selectedDate);
      from.setDate(from.getDate() - 14);
      const to = new Date(selectedDate);
      to.setDate(to.getDate() + 14);
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      const res = await fetch(`/api/booking?from=${fromStr}&to=${toStr}`);
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
        masterName: b.masterName || undefined,
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

  const showUndo = useCallback((action: UndoAction) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoAction(action);
    undoTimerRef.current = setTimeout(() => setUndoAction(null), 5000);
  }, []);

  const handleUndo = useCallback(async () => {
    if (!undoAction) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    const { bookingId, previousData } = undoAction;
    setUndoAction(null);
    // Optimistic revert
    setRawBookings(prev => prev.map(b => b.id === bookingId ? { ...b, ...previousData } : b));
    try {
      await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookingId, ...previousData })
      });
      loadBookings();
    } catch { loadBookings(); }
  }, [undoAction]);

  const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date, newResourceId: string) => {
    const oldBooking = rawBookings.find(b => b.id === eventId);
    const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newTimeEnd = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    // Save previous state for undo
    if (oldBooking) {
      showUndo({
        type: 'move',
        bookingId: eventId,
        previousData: { date: oldBooking.date, time: oldBooking.time, timeEnd: oldBooking.timeEnd, duration: oldBooking.duration, masterId: oldBooking.masterId },
        message: 'Запис переміщено',
      });
    }

    // Optimistic update
    setRawBookings(prev => prev.map(b =>
      b.id === eventId
        ? { ...b, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration, masterId: newResourceId }
        : b
    ));

    try {
      await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration, masterId: newResourceId })
      });
      loadBookings();
    } catch (error) {
      console.error('Failed to move booking:', error);
      loadBookings();
    }
  };

  const handleEventResize = async (eventId: string, newStart: Date, newEnd: Date) => {
    const oldBooking = rawBookings.find(b => b.id === eventId);
    const newDate = `${newStart.getFullYear()}-${String(newStart.getMonth() + 1).padStart(2, '0')}-${String(newStart.getDate()).padStart(2, '0')}`;
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newTimeEnd = `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);

    if (oldBooking) {
      showUndo({
        type: 'resize',
        bookingId: eventId,
        previousData: { date: oldBooking.date, time: oldBooking.time, timeEnd: oldBooking.timeEnd, duration: oldBooking.duration },
        message: 'Час змінено',
      });
    }

    setRawBookings(prev => prev.map(b =>
      b.id === eventId
        ? { ...b, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration }
        : b
    ));

    try {
      await fetch('/api/booking', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId, date: newDate, time: newTime, timeEnd: newTimeEnd, duration: newDuration })
      });
      loadBookings();
    } catch (error) {
      console.error('Failed to resize booking:', error);
      loadBookings();
    }
  };

  const handleTimeRangeSelect = (start: Date, end: Date, resourceId: string) => {
    setSelectedSlot({ start, end, resourceId });
    setIsColleagueBookingOpen(true);
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
    setIsColleagueBookingOpen(true);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile header */}
      <header
        className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-40"
        style={{ height: '56px', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {/* Burger */}
        <button
          onClick={openSidebar}
          className="shrink-0 active:scale-95 transition-transform"
          style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu className="text-gray-700" style={{ width: '18px', height: '18px' }} />
        </button>

        {/* Day/Week segment */}
        <ViewModeSegment viewMode={viewMode} onChange={(mode) => {
          setViewMode(mode);
          if (mode === 'week' && weekFilterMasterIds.length === 0 && masters.length > 0) {
            setWeekFilterMasterIds([masters[0].id]);
          }
        }} />

        {/* Today */}
        <button
          onClick={goToToday}
          className="shrink-0 transition-colors duration-300 active:scale-[0.95] active:opacity-80 relative flex items-center justify-center"
          style={{ height: '44px', width: '96px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', fontSize: '13px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}
        >
          <span className={`transition-all duration-300 ease-out absolute left-2.5 ${isToday ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>✓</span>
          <span className={`transition-transform duration-300 ease-out ${isToday ? 'translate-x-2' : 'translate-x-0'}`}>Сьогодні</span>
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar */}
        <button
          onClick={() => {/* TODO: profile */}}
          className="shrink-0 active:opacity-80 transition-opacity"
          style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '14px' }}
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </button>
      </header>

      {/* Week master filter panel — slides down when week mode */}
      <div
        className="lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-white border-b border-gray-200"
        style={{
          maxHeight: viewMode === 'week' ? '56px' : '0px',
          opacity: viewMode === 'week' ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
          {/* "Всі" button */}
          <button
            className={`inline-btn shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 border ${
              weekFilterMasterIds.length === 0 || weekFilterMasterIds.length === masters.length
                ? 'bg-black text-white border-black'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
            onClick={() => setWeekFilterMasterIds(
              weekFilterMasterIds.length === masters.length ? (masters.length > 0 ? [masters[0].id] : []) : masters.map(m => m.id)
            )}
          >
            Всі
          </button>
          {/* Master chips */}
          {masters.map((m, idx) => {
            const isSelected = weekFilterMasterIds.includes(m.id);
            const color = m.color || getColorForIndex(idx);
            return (
              <button
                key={m.id}
                className={`inline-btn shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200 border ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
                style={isSelected ? { backgroundColor: color, borderColor: color } : {}}
                onClick={() => {
                  setWeekFilterMasterIds(prev => {
                    if (prev.includes(m.id)) {
                      const next = prev.filter(id => id !== m.id);
                      return next.length === 0 ? [m.id] : next; // can't deselect all
                    }
                    return [...prev, m.id];
                  });
                }}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : color, color: isSelected ? 'white' : 'white' }}
                >
                  {m.name.charAt(0)}
                </div>
                <span className="max-w-[60px] truncate">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

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
          resources={viewMode === 'week' && weekFilterMasterIds.length > 0 && weekFilterMasterIds.length < masters.length
            ? calendarResources.filter(r => weekFilterMasterIds.includes(r.id))
            : calendarResources}
          events={viewMode === 'week' && weekFilterMasterIds.length > 0 && weekFilterMasterIds.length < masters.length
            ? calendarEvents.filter(e => weekFilterMasterIds.includes(e.resource))
            : calendarEvents}
          startDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          onEventMove={handleEventMove}
          onEventResize={handleEventResize}
          onTimeRangeSelect={handleTimeRangeSelect}
          onEmptySlotMenu={(_x, _y, slotInfo) => {
            const master = masters.find(m => m.id === slotInfo?.resourceId);
            const masterColor = master?.color || getColorForIndex(masters.findIndex(m => m.id === slotInfo?.resourceId));
            const min = slotInfo?.startMin ?? 0;
            const dayNames = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
            const monthNames = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
            const dayName = dayNames[selectedDate.getDay()];
            const dateLabel = `${dayName}, ${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}`;

            // Remove previous phantom
            document.querySelectorAll('[data-phantom-highlight]').forEach(el => el.remove());

            const scrollEl = slotInfo?.scrollEl;
            const cellRect = slotInfo?.cellRect;

            // Step 1: Smooth scroll cell to center of viewport
            if (scrollEl && cellRect) {
              const scrollRect = scrollEl.getBoundingClientRect();
              const cellCenterY = cellRect.top - scrollRect.top + scrollEl.scrollTop + cellRect.height / 2;
              const cellCenterX = cellRect.left - scrollRect.left + scrollEl.scrollLeft + cellRect.width / 2;
              const targetScrollTop = cellCenterY - scrollRect.height / 2;
              const targetScrollLeft = cellCenterX - scrollRect.width / 2;
              scrollEl.scrollTo({
                top: Math.max(0, targetScrollTop),
                left: Math.max(0, targetScrollLeft),
                behavior: 'smooth',
              });
            }

            // Step 2: After scroll completes, show phantom + menu
            setTimeout(() => {
              // Recalculate cell position after scroll
              let finalCellRect = cellRect;
              if (slotInfo?.cellRect && scrollEl) {
                // Re-query the column to get updated position
                const resContainer = scrollEl.querySelector('[data-resources]');
                if (resContainer) {
                  const cols = resContainer.children;
                  const resIdx = masters.findIndex(m => m.id === slotInfo.resourceId);
                  const colEl = resIdx >= 0 ? cols[resIdx] as HTMLElement : null;
                  if (colEl) {
                    const colRect = colEl.getBoundingClientRect();
                    const totalMin = (21 - 8) * 60;
                    const relMin = min - 8 * 60;
                    const step = settings.gridStep || 15;
                    const cellTop = colRect.top + (relMin / totalMin) * colRect.height;
                    const cellH = (step / totalMin) * colRect.height;
                    finalCellRect = { top: cellTop, left: colRect.left, width: colRect.width, height: cellH };
                  }
                }
              }

              // Show phantom highlight on the cell
              if (finalCellRect) {
                const phantom = document.createElement('div');
                phantom.setAttribute('data-phantom-highlight', '');
                phantom.style.cssText = `
                  position:fixed;
                  top:${finalCellRect.top}px;
                  left:${finalCellRect.left}px;
                  width:${finalCellRect.width}px;
                  height:${finalCellRect.height}px;
                  border:2px dashed ${masterColor};
                  background:${masterColor}20;
                  border-radius:8px;
                  pointer-events:none;
                  z-index:55;
                  transition:opacity 300ms;
                `;
                document.body.appendChild(phantom);
              }

              // Position menu: centered below the cell, 8px gap
              const menuX = finalCellRect ? finalCellRect.left + finalCellRect.width / 2 : window.innerWidth / 2;
              const menuY = finalCellRect ? finalCellRect.top + finalCellRect.height + 8 : window.innerHeight / 2;

              setSettingsMenu({
                open: true,
                x: menuX,
                y: menuY,
                startMin: slotInfo?.startMin,
                resourceId: slotInfo?.resourceId,
                resourceName: master?.name || 'Невідомий',
                dateLabel,
                selectedMin: min,
                masterColor,
                cellRect: finalCellRect,
                scrollEl: scrollEl || undefined,
              });
              requestAnimationFrame(() => setMenuAnimating(true));
            }, 350); // wait for smooth scroll
          }}
          timeStep={settings.gridStep}
          dayStartHour={8}
          dayEndHour={21}
          timezone={salonTimezone}
          viewMode={viewMode}
          salonWorkingHours={salonWorkingHours}
          masterWorkingHours={masters.reduce((acc, m) => { if (m.workingHours) acc[m.id] = m.workingHours; return acc; }, {} as Record<string, WorkingHours>)}
        />
      </div>

      {/* Контекстне меню (порожній слот) */}
      {settingsMenu.open && (
        <div className="fixed inset-0 z-[60]" onClick={() => {
          setMenuAnimating(false);
          document.querySelectorAll('[data-phantom-highlight]').forEach(el => {
            (el as HTMLElement).style.opacity = '0';
            setTimeout(() => el.remove(), 300);
          });
          setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 200);
        }}>
          <div
            ref={(el) => {
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              // Center horizontally under cell, clamp to viewport
              let x = settingsMenu.x - rect.width / 2;
              let y = settingsMenu.y;
              if (x + rect.width > vw - 16) x = vw - rect.width - 16;
              if (x < 16) x = 16;
              if (y + rect.height > vh - 16) y = settingsMenu.y - rect.height - (settingsMenu.cellRect?.height || 0) - 16;
              if (y < 16) y = 16;
              el.style.left = `${x}px`;
              el.style.top = `${y}px`;
            }}
            className={`fixed bg-white border border-gray-200 rounded-2xl shadow-2xl p-2 min-w-[200px] max-w-[260px] transition-all duration-200 origin-top ${
              menuAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ left: settingsMenu.x, top: settingsMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Master name + date */}
            <div className="px-2 pt-1 pb-2">
              <div className="flex items-center gap-2">
                {settingsMenu.masterColor && (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: settingsMenu.masterColor }} />
                )}
                <span className="text-[13px] font-semibold text-gray-900">{settingsMenu.resourceName}</span>
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 ml-[18px]">{settingsMenu.dateLabel}</div>
            </div>

            {/* Time picker - horizontal scroll with fade edges */}
            <div className="mx-1 mb-2 relative">
              {/* Fade edges to hint at scrollability */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 rounded-l-xl" style={{ background: 'linear-gradient(to right, #f3f4f6, transparent)' }} />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 z-10 rounded-r-xl" style={{ background: 'linear-gradient(to left, #f3f4f6, transparent)' }} />
              <div
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide py-2 px-4 gap-1 bg-gray-100 rounded-xl"
                ref={(el) => {
                  if (!el) return;
                  // Scroll selected into center
                  const selected = el.querySelector('[data-time-selected="true"]');
                  if (selected) {
                    el.scrollLeft = (selected as HTMLElement).offsetLeft - el.offsetWidth / 2 + (selected as HTMLElement).offsetWidth / 2;
                  }
                }}
              >
                {(() => {
                  const originalMin = settingsMenu.startMin ?? 0;
                  const currentMin = settingsMenu.selectedMin ?? originalMin;
                  const step = 5;
                  const range = 30; // ±30 min from original click
                  const times: number[] = [];
                  for (let t = originalMin - range; t <= originalMin + range; t += step) {
                    if (t >= 0 && t < 24 * 60) times.push(t);
                  }
                  return times.map(t => {
                    const hh = Math.floor(t / 60);
                    const mm = t % 60;
                    const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                    const isSelected = t === currentMin;
                    return (
                      <button
                        key={t}
                        data-time-selected={isSelected ? 'true' : 'false'}
                        className={`inline-btn snap-center flex-shrink-0 w-[46px] py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                          isSelected
                            ? 'bg-black text-white shadow-md scale-105'
                            : 'text-gray-400 hover:text-gray-700 hover:bg-white/60'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const phantom = document.querySelector('[data-phantom-highlight]') as HTMLElement;
                          const scEl = settingsMenu.scrollEl;
                          if (phantom && scEl) {
                            const resContainer = scEl.querySelector('[data-resources]');
                            if (resContainer) {
                              const cols = resContainer.children;
                              const resIdx = masters.findIndex(m => m.id === settingsMenu.resourceId);
                              const colEl = resIdx >= 0 ? cols[resIdx] as HTMLElement : null;
                              if (colEl) {
                                const colRect = colEl.getBoundingClientRect();
                                const totalMin = (21 - 8) * 60;
                                const relMin = t - 8 * 60;
                                const gridStep = settings.gridStep || 15;
                                const cellTopViewport = colRect.top + (relMin / totalMin) * colRect.height;
                                const cellH = (gridStep / totalMin) * colRect.height;

                                // Scroll so new cell is centered
                                const scRect = scEl.getBoundingClientRect();
                                const cellCenterInScroll = cellTopViewport - scRect.top + scEl.scrollTop + cellH / 2;
                                const cellCenterX = colRect.left - scRect.left + scEl.scrollLeft + colRect.width / 2;
                                scEl.scrollTo({
                                  top: Math.max(0, cellCenterInScroll - scRect.height / 2),
                                  left: Math.max(0, cellCenterX - scRect.width / 2),
                                  behavior: 'smooth',
                                });

                                // After scroll, update phantom + menu position
                                setTimeout(() => {
                                  const newColRect = colEl.getBoundingClientRect();
                                  const newCellTop = newColRect.top + (relMin / totalMin) * newColRect.height;
                                  const newCellH = (gridStep / totalMin) * newColRect.height;
                                  phantom.style.top = `${newCellTop}px`;
                                  phantom.style.left = `${newColRect.left}px`;
                                  phantom.style.width = `${newColRect.width}px`;
                                  phantom.style.height = `${newCellH}px`;
                                  // Update menu position — centered below phantom
                                  const menuX = newColRect.left + newColRect.width / 2;
                                  const menuY = newCellTop + newCellH + 8;
                                  setSettingsMenu(prev => ({
                                    ...prev, selectedMin: t, x: menuX, y: menuY,
                                    cellRect: { top: newCellTop, left: newColRect.left, width: newColRect.width, height: newCellH },
                                  }));
                                }, 350);
                              }
                            }
                          } else {
                            setSettingsMenu(prev => ({ ...prev, selectedMin: t }));
                          }
                        }}
                      >
                        {label}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-0.5">
              <button
                className="inline-btn px-3 py-2.5 text-sm font-medium hover:bg-gray-50 rounded-xl w-full text-left flex items-center gap-2.5 transition-colors"
                onClick={() => {
                  setMenuAnimating(false);
                  document.querySelectorAll('[data-phantom-highlight]').forEach(el => el.remove());
                  setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 150);
                  const startMin = settingsMenu.selectedMin ?? settingsMenu.startMin ?? 10 * 60;
                  const h = Math.floor(startMin / 60);
                  const m = startMin % 60;
                  const slotStart = new Date(selectedDate);
                  slotStart.setHours(h, m, 0, 0);
                  const slotEnd = new Date(slotStart.getTime() + 60 * 60000);
                  setSelectedSlot({ start: slotStart, end: slotEnd, resourceId: settingsMenu.resourceId || resources[0]?.id || '' });
                  setIsColleagueBookingOpen(true);
                }}
              >
                <Plus className="h-4 w-4 text-gray-500" />
                Додати запис
              </button>
              <button
                className="inline-btn px-3 py-2.5 text-sm font-medium hover:bg-gray-50 rounded-xl w-full text-left flex items-center gap-2.5 transition-colors"
                onClick={() => {
                  setMenuAnimating(false);
                  document.querySelectorAll('[data-phantom-highlight]').forEach(el => el.remove());
                  setTimeout(() => setSettingsMenu({ open: false, x: 0, y: 0 }), 150);
                  setSettingsOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                Налаштування
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar налаштувань календаря */}
      <div className={`fixed inset-y-0 right-0 w-[300px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-out flex flex-col ${settingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
          <h3 className="font-semibold">Налаштування</h3>
          <button className="h-8 w-8 rounded-lg hover:bg-gray-100" onClick={() => setSettingsOpen(false)}>✕</button>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto flex-1 pb-24">
          {/* Grid step */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Сітка часу</div>
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

          {/* Palette */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Палітра кольорів</div>
            <div className="space-y-2">
              {(() => {
                // Dynamic import not needed — palettes are small
                const palettes = [
                  { id: 'rose-bloom', name: 'Rosé Bloom', desc: 'Жіночий салон' },
                  { id: 'heritage-vault', name: 'Heritage Vault', desc: 'Барбершоп' },
                  { id: 'earth-harmony', name: 'Earth Harmony', desc: 'Унісекс' },
                ];
                return palettes.map(p => {
                  const isActive = settings.paletteId === p.id;
                  const colors = (() => {
                    // Inline palette color previews
                    const map: Record<string, string[]> = {
                      'rose-bloom': ['#D88B79', '#C09BAC', '#BEA98E', '#A6445D', '#9B7E82'],
                      'heritage-vault': ['#2E4053', '#5B6E74', '#62929E', '#8B7355', '#142F40'],
                      'earth-harmony': ['#87C2CA', '#BAB8A8', '#E6D17B', '#DF93B4', '#94B5FD'],
                    };
                    return map[p.id] || [];
                  })();
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPaletteId(p.id)}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isActive ? 'border-black bg-gray-50' : 'border-transparent bg-gray-50/50 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold">{p.name}</span>
                        <span className="text-[10px] text-gray-400">{p.desc}</span>
                      </div>
                      <div className="flex gap-1">
                        {colors.map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-md" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
            {/* Save & assign button */}
            <button
              className="w-full mt-3 py-2.5 rounded-xl bg-black text-white text-sm font-semibold active:scale-[0.98] transition-all"
              onClick={async () => {
                try {
                  const res = await fetch('/api/masters/assign-colors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ colors: settings.colors }),
                  });
                  if (res.ok) {
                    await loadMasters();
                    setSettingsOpen(false);
                  }
                } catch (e) {
                  console.error('Failed to assign colors:', e);
                }
              }}
            >
              Зберегти та призначити кольори
            </button>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Кожен майстер отримає випадковий колір з палітри
            </p>
          </div>
        </div>
      </div>
      {settingsOpen && <div className="fixed inset-0 bg-black/20 z-[65]" onClick={() => setSettingsOpen(false)} />}

      {/* Mobile FABs — calendar + add */}
      <Button
        className="lg:hidden fixed right-2 bottom-[178px] w-14 h-14 rounded-2xl shadow-lg z-50 bg-gray-900 hover:bg-gray-800"
        size="icon"
        onClick={() => setIsMobileCalendarOpen(true)}
      >
        <CalendarIcon className="h-6 w-6" />
      </Button>
      <Button
        className="lg:hidden fixed right-2 bottom-[108px] w-14 h-14 rounded-2xl shadow-lg z-50 bg-gray-900 hover:bg-gray-800"
        size="icon"
        onClick={handleFabClick}
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Mobile calendar picker overlay */}
      {/* Undo toast */}
      <div
        className={`fixed left-4 right-4 z-[60] flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-lg transition-all duration-300 ease-out ${
          undoAction ? 'bottom-[88px] opacity-100 translate-y-0' : 'bottom-[88px] opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <span className="text-sm font-medium">{undoAction?.message}</span>
        <button
          onClick={handleUndo}
          className="text-sm font-semibold text-yellow-400 hover:text-yellow-300 transition-colors shrink-0"
        >
          Скасувати
        </button>
      </div>

      <MobileCalendarPicker
        isOpen={isMobileCalendarOpen}
        onClose={() => setIsMobileCalendarOpen(false)}
        selected={selectedDate}
        onSelect={(date) => { setSelectedDate(date); }}
      />

      {/* Event details modal */}
      <EventModal
        event={selectedEvent}
        isOpen={isEventModalOpen}
        isEditOpen={isEditModalOpen}
        masterColor={selectedEvent ? (eventColors[selectedEvent.resource] || getColorForIndex(masters.findIndex(m => m.id === selectedEvent.resource))) : undefined}
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
      {user?.salonId && (
        <ColleagueBookingModal
          isOpen={isColleagueBookingOpen}
          onClose={() => setIsColleagueBookingOpen(false)}
          salonId={user.salonId}
          currentMasterId={selectedSlot?.resourceId || null}
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
