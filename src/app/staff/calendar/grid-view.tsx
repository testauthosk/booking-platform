'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { staffFetch } from '@/lib/staff-fetch';
import { Loader2, Plus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';
import { ClientCardPanel } from '@/components/staff/client-card-panel';
import dynamic from 'next/dynamic';
import type { CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';

const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> }
);

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
  onColleagueCalendar: () => void;
}

export default function StaffGridView({ onColleagueCalendar }: StaffGridViewProps) {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [staffColor, setStaffColor] = useState('#87C2CA');
  const [staffWorkingHours, setStaffWorkingHours] = useState<Record<string, WorkingDay> | null>(null);
  const [salonId, setSalonId] = useState('');
  const [salonTimezone, setSalonTimezone] = useState('Europe/Kiev');
  const [salonWorkingHours, setSalonWorkingHours] = useState<Record<string, WorkingDay> | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [clientCardPhone, setClientCardPhone] = useState('');
  const [clientCardName, setClientCardName] = useState('');

  // Event details bottom sheet
  const [selectedEvent, setSelectedEvent] = useState<BookingFromAPI | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
          if (data.color) {
            setStaffColor(data.color);
          } else if (data.paletteId) {
            // Fallback to first color of salon palette
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

  // Load services
  useEffect(() => {
    (async () => {
      try {
        const res = await staffFetch('/api/staff/services');
        if (res.ok) setServices(await res.json());
      } catch (e) { console.error('Load services error:', e); }
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

  useEffect(() => { if (staffId) loadBookings(); }, [staffId, loadBookings]);

  // Filter only own bookings
  const myBookings = useMemo(() => rawBookings.filter(b => b.masterId === staffId), [rawBookings, staffId]);

  const calendarResources: CalendarResource[] = useMemo(() => [
    { id: staffId, name: staffName, color: staffColor },
  ], [staffId, staffName, staffColor]);

  const calendarEvents: CalendarEvent[] = useMemo(() => {
    return myBookings.map(b => {
      const [sh, sm] = b.time.split(':').map(Number);
      let eh: number, em: number;
      if (b.timeEnd) { [eh, em] = b.timeEnd.split(':').map(Number); }
      else { const d = new Date(2000, 0, 1, sh, sm); d.setMinutes(d.getMinutes() + b.duration); eh = d.getHours(); em = d.getMinutes(); }
      return {
        id: b.id,
        text: b.serviceName || 'Запис',
        start: `${b.date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
        end: `${b.date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
        resource: staffId,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        serviceName: b.serviceName || undefined,
        masterName: b.masterName || undefined,
        status: b.status?.toLowerCase(),
      };
    });
  }, [myBookings, staffId]);

  // Handlers
  const handleEventClick = (event: CalendarEvent) => {
    const booking = myBookings.find(b => b.id === event.id);
    if (booking) { setSelectedEvent(booking); setEventSheetOpen(true); }
  };

  const handleEventMove = async (eventId: string, newStart: Date, newEnd: Date) => {
    const newTime = `${String(newStart.getHours()).padStart(2, '0')}:${String(newStart.getMinutes()).padStart(2, '0')}`;
    const newDuration = Math.round((newEnd.getTime() - newStart.getTime()) / 60000);
    setRawBookings(prev => prev.map(b => b.id === eventId
      ? { ...b, time: newTime, duration: newDuration, timeEnd: `${String(newEnd.getHours()).padStart(2, '0')}:${String(newEnd.getMinutes()).padStart(2, '0')}` }
      : b));
    try {
      await staffFetch('/api/staff/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: eventId, time: newTime, duration: newDuration }),
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
      {/* Navigation header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/staff')} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Мій календар</h1>
            <p className="text-xs text-gray-500">Сьогодні</p>
          </div>
        </div>
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {loadingBookings && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        <DayPilotResourceCalendar
          resources={calendarResources}
          events={calendarEvents}
          startDate={selectedDate}
          onDateChange={setSelectedDate}
          onEventClick={handleEventClick}
          onEventMove={(id, start, end) => handleEventMove(id, start, end)}
          onEventResize={(id, start, end) => handleEventMove(id, start, end)}
          onTimeRangeSelect={() => setAddModalOpen(true)}
          timeStep={15}
          dayStartHour={8}
          dayEndHour={21}
          timezone={salonTimezone}
          viewMode="day"
          salonWorkingHours={salonWorkingHours}
          masterWorkingHours={staffWorkingHours ? { [staffId]: staffWorkingHours } : undefined}
        />
      </div>

      {/* FAB — add booking, bottom right */}
      <Button
        className="fixed right-4 bottom-[40px] w-12 h-12 rounded-2xl shadow-lg z-50 bg-gray-900 hover:bg-gray-800"
        size="icon"
        onClick={() => setAddModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

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

      {/* Add booking modal */}
      <StaffBookingModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        masterId={staffId}
        salonId={salonId}
        masterName={staffName}
        services={services}
        onSuccess={() => { setAddModalOpen(false); loadBookings(); }}
      />

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
    </div>
  );
}
