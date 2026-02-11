'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { staffFetch } from '@/lib/staff-fetch';
import { Loader2, ChevronLeft, Plus } from 'lucide-react';
import { ClientCardPanel } from '@/components/staff/client-card-panel';
import { CalendarPickerModal } from '@/components/staff/calendar-picker-modal';
import dynamic from 'next/dynamic';
import type { CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';

const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> }
);

const DAYS_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

interface BookingFromAPI {
  id: string;
  masterId: string | null;
  clientId: string | null;
  clientName: string;
  clientPhone: string;
  serviceId: string | null;
  serviceName: string | null;
  masterName: string | null;
  date: string;
  time: string;
  timeEnd: string | null;
  duration: number;
  status: string;
}

interface WorkingDay {
  start: string;
  end: string;
  enabled: boolean;
}

interface StaffGridViewProps {
  selectedDate: Date;
  onDateChange: (d: Date) => void;
  onAddBooking: () => void;
  reloadKey?: number;
}

export default function StaffGridView({ selectedDate, onDateChange, onAddBooking, reloadKey }: StaffGridViewProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffColor, setStaffColor] = useState('#87C2CA');
  const [staffAvatar, setStaffAvatar] = useState('');
  const [staffWorkingHours, setStaffWorkingHours] = useState<Record<string, WorkingDay> | null>(null);
  const [salonId, setSalonId] = useState('');
  const [salonTimezone, setSalonTimezone] = useState('Europe/Kiev');
  const [salonWorkingHours, setSalonWorkingHours] = useState<Record<string, WorkingDay> | null>(null);
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Modals
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [clientCardPhone, setClientCardPhone] = useState('');
  const [clientCardName, setClientCardName] = useState('');
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);

  // Event details bottom sheet
  const [selectedEvent, setSelectedEvent] = useState<BookingFromAPI | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const daysContainerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);

  const formatDateHeader = (date: Date) => {
    if (date.toDateString() === new Date().toDateString()) return 'Сьогодні';
    const monthNames = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    return `${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  // Load profile
  useEffect(() => {
    (async () => {
      try {
        const res = await staffFetch('/api/staff/profile');
        if (res.ok) {
          const data = await res.json();
          setStaffId(data.id);
          setStaffName(data.name);
          setSalonId(data.salonId);
          if (data.avatar) setStaffAvatar(data.avatar);
          if (data.color) {
            setStaffColor(data.color);
          } else if (data.paletteId) {
            const { getPaletteById } = await import('@/lib/color-palettes');
            const palette = getPaletteById(data.paletteId);
            if (palette && palette.colors.length > 0) {
              setStaffColor(palette.colors[0].hex);
            }
          }
          if (data.workingHours) setStaffWorkingHours(data.workingHours as Record<string, WorkingDay>);
        }
      } catch (e) { console.error('Load profile error:', e); }
    })();
  }, []);

  // Load salon
  useEffect(() => {
    (async () => {
      try {
        const res = await staffFetch('/api/staff/salon');
        if (res.ok) {
          const data = await res.json();
          if (data.timezone) setSalonTimezone(data.timezone);
          if (data.workingHours) setSalonWorkingHours(data.workingHours as Record<string, WorkingDay>);
        }
      } catch (e) { console.error('Load salon error:', e); }
    })();
  }, []);

  // Load bookings
  const loadBookings = useCallback(async () => {
    if (!staffId) return;
    setLoadingBookings(true);
    try {
      const from = new Date(selectedDate);
      from.setDate(from.getDate() - 14);
      const to = new Date(selectedDate);
      to.setDate(to.getDate() + 14);
      const res = await staffFetch(`/api/staff/bookings/all?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`);
      if (res.ok) setRawBookings(await res.json());
    } catch (e) { console.error('Load bookings error:', e); }
    finally { setLoadingBookings(false); setLoading(false); }
  }, [staffId, selectedDate]);

  useEffect(() => { if (staffId) loadBookings(); }, [staffId, loadBookings, reloadKey]);

  // Filter only own bookings
  const myBookings = useMemo(() => rawBookings.filter(b => b.masterId === staffId), [rawBookings, staffId]);

  // 2-day view
  const secondDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    return d;
  }, [selectedDate]);

  const day1Str = useMemo(() => `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`, [selectedDate]);
  const day2Str = useMemo(() => `${secondDate.getFullYear()}-${String(secondDate.getMonth() + 1).padStart(2, '0')}-${String(secondDate.getDate()).padStart(2, '0')}`, [secondDate]);

  const calendarResources: CalendarResource[] = useMemo(() => [
    { id: 'day-0', name: `${DAYS_UA[selectedDate.getDay()]} ${selectedDate.getDate()}`, color: staffColor, avatar: staffAvatar || undefined },
    { id: 'day-1', name: `${DAYS_UA[secondDate.getDay()]} ${secondDate.getDate()}`, color: staffColor, avatar: staffAvatar || undefined },
  ], [selectedDate, secondDate, staffColor, staffAvatar]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return myBookings
      .filter(b => b.date === day1Str || b.date === day2Str)
      .map(b => {
        const [sh, sm] = b.time.split(':').map(Number);
        let eh: number, em: number;
        if (b.timeEnd) { [eh, em] = b.timeEnd.split(':').map(Number); }
        else { const d = new Date(2000, 0, 1, sh, sm); d.setMinutes(d.getMinutes() + b.duration); eh = d.getHours(); em = d.getMinutes(); }
        const resourceId = b.date === day1Str ? 'day-0' : 'day-1';
        return {
          id: b.id,
          text: b.serviceName || 'Запис',
          start: `${b.date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
          end: `${b.date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
          resource: resourceId,
          clientName: b.clientName,
          clientPhone: b.clientPhone,
          serviceName: b.serviceName || undefined,
          masterName: b.masterName || undefined,
          status: b.status?.toLowerCase(),
        };
      });
  }, [myBookings, day1Str, day2Str]);

  // Days for week strip (14 days from today)
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  }), []);

  // Hybrid indicator: first render = bg on buttons, after first switch = absolute sliding indicator
  const [hasInteracted, setHasInteracted] = useState(false);
  const handleDayClick = useCallback((date: Date) => {
    if (!hasInteracted) {
      // Position indicator at current pair BEFORE switching hasInteracted
      const container = daysContainerRef.current;
      const indicator = indicatorRef.current;
      if (container && indicator) {
        const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
        const second = container.querySelector('[data-day-second="true"]') as HTMLElement;
        if (selected) {
          const containerRect = container.getBoundingClientRect();
          const selectedRect = selected.getBoundingClientRect();
          const endEl = second || selected;
          const endRect = endEl.getBoundingClientRect();
          // Place indicator exactly where buttons are, no transition
          indicator.style.transition = 'none';
          indicator.style.left = `${selectedRect.left - containerRect.left + container.scrollLeft}px`;
          indicator.style.width = `${endRect.right - selectedRect.left}px`;
          indicator.style.top = `${selectedRect.top - containerRect.top}px`;
          indicator.style.height = `${selectedRect.height}px`;
          indicator.style.opacity = '1';
          // Force reflow, then re-enable transition
          indicator.offsetHeight;
          indicator.style.transition = 'left 0.3s ease, width 0.3s ease';
        }
      }
      setHasInteracted(true);
    }
    onDateChange(date);
  }, [hasInteracted, onDateChange]);

  // Position sliding indicator (only active after first interaction)
  useEffect(() => {
    if (!hasInteracted) return;
    
    const positionIndicator = () => {
      const container = daysContainerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) return;
      
      const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
      if (!selected) return;
      
      const second = container.querySelector('[data-day-second="true"]') as HTMLElement;
      const containerRect = container.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();
      
      if (selectedRect.width === 0) return;
      
      const endEl = second || selected;
      const endRect = endEl.getBoundingClientRect();
      
      const left = selectedRect.left - containerRect.left + container.scrollLeft;
      const width = endRect.right - selectedRect.left;
      const top = selectedRect.top - containerRect.top;
      const height = selectedRect.height;
      
      indicator.style.left = `${left}px`;
      indicator.style.width = `${width}px`;
      indicator.style.top = `${top}px`;
      indicator.style.height = `${height}px`;
      indicator.style.opacity = '1';
    };

    // Scroll into view
    const container = daysContainerRef.current;
    if (container) {
      const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    positionIndicator();
    requestAnimationFrame(positionIndicator);
    const t1 = setTimeout(positionIndicator, 100);
    
    const onScroll = () => positionIndicator();
    container?.addEventListener('scroll', onScroll);
    
    return () => {
      clearTimeout(t1);
      container?.removeEventListener('scroll', onScroll);
    };
  }, [selectedDate, secondDate, hasInteracted]);

  // Scroll selected into view on first render (no indicator, just scroll)
  useEffect(() => {
    const container = daysContainerRef.current;
    if (container) {
      const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: 'instant' as any, inline: 'center', block: 'nearest' });
      }
    }
  }, []);

  // Handlers
  const handleEventClick = (event: CalendarEvent) => {
    const booking = myBookings.find(b => b.id === event.id);
    if (booking) { setSelectedEvent(booking); setEventSheetOpen(true); }
  };

  const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date, newResourceId?: string) => {
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
    const newDate = newResourceId === 'day-1' ? day2Str : day1Str;
    setRawBookings(prev => prev.map(b => b.id === eventId
      ? { ...b, date: newDate, time: newTime, duration: newDuration, timeEnd: `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}` }
      : b));
    try {
      await staffFetch('/api/staff/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: eventId, date: newDate, time: newTime, duration: newDuration }),
      });
      loadBookings();
    } catch { loadBookings(); }
  };

  const handleStatusChange = async (bookingId: string, status: string) => {
    setActionLoading(true);
    try {
      const res = await staffFetch('/api/staff/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status }),
      });
      if (res.ok) { setEventSheetOpen(false); setSelectedEvent(null); await loadBookings(); }
      else { const err = await res.json().catch(() => ({})); alert(err.error || 'Помилка'); }
    } catch { alert('Помилка'); }
    finally { setActionLoading(false); }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative" style={{ maxWidth: '100vw' }}>
      {/* Header — same style as timeline */}
      <header className="bg-card border-b px-4 py-3 shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/staff')}
              className="h-10 w-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-colors shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Мій календар</h1>
              <p className="text-sm text-muted-foreground">{formatDateHeader(selectedDate)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Calendar picker button */}
            <button
              onClick={() => setCalendarPickerOpen(true)}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Today button — checkmark animates in from left like "Записи" */}
            <button
              onClick={() => onDateChange(new Date())}
              className="h-10 w-[100px] rounded-xl text-sm font-medium border border-zinc-200 bg-white transition-colors duration-300 flex items-center justify-center gap-1 relative"
            >
              <span className={`transition-all duration-300 ease-out absolute left-2.5 ${isToday ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>✓</span>
              <span className={`transition-transform duration-300 ease-out ${isToday ? 'translate-x-2' : 'translate-x-0'}`}>Сьогодні</span>
            </button>
            {/* Add booking */}
            <button
              onClick={onAddBooking}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Week strip with sliding indicator */}
      <div className="shrink-0 bg-card border-b">
        <div ref={daysContainerRef} className={`flex ${hasInteracted ? 'gap-2' : 'gap-0'} px-4 py-3 overflow-x-auto scrollbar-hide items-center relative`}>
          {/* Sliding indicator — positioned via ref */}
          <div
            ref={indicatorRef}
            className="absolute bg-primary rounded-xl shadow-lg z-0 pointer-events-none"
            style={{ transition: 'left 0.3s ease, width 0.3s ease, opacity 0.15s ease', opacity: 0 }}
          />
          {days.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isSecondDay = date.toDateString() === secondDate.toDateString();
            const isInPair = isSelected || isSecondDay;
            const isTodayDay = date.toDateString() === new Date().toDateString();
            // Before first interaction: bg directly on buttons (no gap, shared shape).
            // After: indicator handles bg.
            let pairClass: string;
            let rounding = 'rounded-xl';
            if (isInPair) {
              if (hasInteracted) {
                pairClass = 'text-primary-foreground'; // indicator provides bg
              } else {
                pairClass = 'bg-primary text-primary-foreground shadow-lg';
                // Make pair look like one rectangle: no rounding on inner sides
                rounding = isSelected ? 'rounded-l-xl rounded-r-none' : 'rounded-r-xl rounded-l-none';
              }
            } else {
              pairClass = isTodayDay ? 'bg-primary/10 text-primary' : 'hover:bg-muted';
            }
            return (
              <button
                key={index}
                data-day-selected={isSelected ? 'true' : undefined}
                data-day-second={isSecondDay ? 'true' : undefined}
                onClick={() => handleDayClick(date)}
                className={`flex flex-col items-center min-w-[56px] py-2 px-2 ${rounding} relative z-10 ${pairClass}`}
                style={!hasInteracted ? (isInPair ? {} : { marginLeft: 4, marginRight: 4 }) : undefined}
              >
                <span className="text-xs font-medium opacity-70">{DAYS_UA[date.getDay()]}</span>
                <span className="text-xl font-bold">{date.getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DayPilot 2-column grid */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {loadingBookings && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        <DayPilotResourceCalendar
          resources={calendarResources}
          events={calendarEvents}
          startDate={selectedDate}
          onDateChange={onDateChange}
          onEventClick={handleEventClick}
          onEventMove={(id, start, end, resourceId) => handleEventMove(id, start, end, resourceId)}
          onEventResize={(id, start, end) => handleEventMove(id, start, end)}
          onTimeRangeSelect={() => {}}
          accentColor={staffColor}
          timeStep={15}
          dayStartHour={(() => {
            if (!staffWorkingHours) return 8;
            const hours = Object.values(staffWorkingHours).filter(d => d.enabled).map(d => parseInt(d.start?.split(':')[0] || '8'));
            return hours.length > 0 ? Math.min(...hours) : 8;
          })()}
          dayEndHour={(() => {
            if (!staffWorkingHours) return 21;
            const hours = Object.values(staffWorkingHours).filter(d => d.enabled).map(d => parseInt(d.end?.split(':')[0] || '21'));
            return hours.length > 0 ? Math.max(...hours) : 21;
          })()}
          timezone={salonTimezone}
          viewMode="day"
          salonWorkingHours={salonWorkingHours}
          masterWorkingHours={staffWorkingHours ? { [staffId]: staffWorkingHours } : undefined}
        />
      </div>

      {/* Event bottom sheet */}
      {eventSheetOpen && selectedEvent && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[60]" onClick={() => setEventSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[61] p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-lg">{selectedEvent.clientName}</p>
                <p className="text-sm text-gray-500">{selectedEvent.serviceName || 'Запис'}</p>
              </div>
              <div className="flex gap-2 text-sm text-gray-500">
                <span>📅 {selectedEvent.date}</span>
                <span>⏰ {selectedEvent.time}{selectedEvent.timeEnd ? ` — ${selectedEvent.timeEnd}` : ''}</span>
                <span>🕐 {selectedEvent.duration} хв</span>
              </div>
              {selectedEvent.clientPhone && selectedEvent.clientPhone !== '-' && (
                <button
                  onClick={() => { setClientCardPhone(selectedEvent.clientPhone); setClientCardName(selectedEvent.clientName); setClientCardOpen(true); setEventSheetOpen(false); }}
                  className="text-sm text-blue-600 font-medium"
                >
                  📞 {selectedEvent.clientPhone}
                </button>
              )}
              {selectedEvent.status !== 'COMPLETED' && selectedEvent.status !== 'CANCELLED' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleStatusChange(selectedEvent.id, 'COMPLETED')} disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl bg-green-50 text-green-700 font-semibold text-sm border border-green-200 hover:bg-green-100 disabled:opacity-50">
                    ✓ Завершити
                  </button>
                  <button onClick={() => handleStatusChange(selectedEvent.id, 'CANCELLED')} disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-semibold text-sm border border-red-200 hover:bg-red-100 disabled:opacity-50">
                    ✕ Скасувати
                  </button>
                  <button onClick={() => handleStatusChange(selectedEvent.id, 'NO_SHOW')} disabled={actionLoading}
                    className="py-3 px-4 rounded-xl bg-gray-50 text-gray-600 font-semibold text-sm border border-gray-200 hover:bg-gray-100 disabled:opacity-50">
                    🚫
                  </button>
                </div>
              )}
              {selectedEvent.status === 'COMPLETED' && (
                <div className="py-2 px-3 bg-green-50 rounded-xl text-sm text-green-700 font-medium">✅ Завершено</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Client card */}
      <ClientCardPanel
        isOpen={clientCardOpen}
        onClose={() => setClientCardOpen(false)}
        clientPhone={clientCardPhone}
        clientName={clientCardName}
        masterId={staffId}
        salonId={salonId}
        accentColor={staffColor}
      />

      {/* Calendar Picker Modal */}
      <CalendarPickerModal
        isOpen={calendarPickerOpen}
        onClose={() => setCalendarPickerOpen(false)}
        onDateSelect={(d) => {
          onDateChange(d);
          setCalendarPickerOpen(false);
        }}
        staffId={staffId}
        salonId={salonId}
        masterColor={staffColor}
        onClientTap={(name, phone) => {
          setClientCardPhone(phone);
          setClientCardName(name);
          setClientCardOpen(true);
        }}
      />
    </div>
  );
}
