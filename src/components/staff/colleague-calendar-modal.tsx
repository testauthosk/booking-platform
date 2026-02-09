'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { staffFetch } from '@/lib/staff-fetch';
import { X, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';
import dynamic from 'next/dynamic';
import type { CalendarEvent, CalendarResource } from '@/components/calendar/daypilot-resource-calendar';

const DayPilotResourceCalendar = dynamic(
  () => import('@/components/calendar/daypilot-resource-calendar').then(mod => mod.DayPilotResourceCalendar),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div> }
);

interface BookingFromAPI {
  id: string;
  masterId: string | null;
  clientName: string;
  clientPhone: string;
  serviceName: string | null;
  masterName: string | null;
  date: string;
  time: string;
  timeEnd: string | null;
  duration: number;
  status: string;
}

interface WorkingDay { start: string; end: string; enabled: boolean; }

interface MasterFromAPI {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  workingHours?: Record<string, WorkingDay>;
}

interface ColleagueCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  salonId: string;
}

const ukDays = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
const ukMonths = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

export function ColleagueCalendarModal({ isOpen, onClose, staffId, salonId }: ColleagueCalendarModalProps) {
  const [masters, setMasters] = useState<MasterFromAPI[]>([]);
  const [rawBookings, setRawBookings] = useState<BookingFromAPI[]>([]);
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [salonTimezone, setSalonTimezone] = useState('Europe/Kiev');
  const [salonWorkingHours, setSalonWorkingHours] = useState<Record<string, WorkingDay> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForMasterId, setAddForMasterId] = useState('');
  const [addForMasterName, setAddForMasterName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      try {
        const [mastersRes, salonRes, servicesRes] = await Promise.all([
          staffFetch('/api/staff/masters'),
          staffFetch('/api/staff/salon'),
          staffFetch('/api/staff/services'),
        ]);
        if (mastersRes.ok) setMasters(await mastersRes.json());
        if (salonRes.ok) {
          const sd = await salonRes.json();
          if (sd.timezone) setSalonTimezone(sd.timezone);
          if (sd.workingHours) setSalonWorkingHours(sd.workingHours as Record<string, WorkingDay>);
        }
        if (servicesRes.ok) setServices(await servicesRes.json());
      } catch (e) { console.error('Load error:', e); }
      finally { setLoading(false); }
    })();
  }, [isOpen]);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      const from = new Date(selectedDate); from.setDate(from.getDate() - 14);
      const to = new Date(selectedDate); to.setDate(to.getDate() + 14);
      const res = await staffFetch(`/api/staff/bookings/all?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`);
      if (res.ok) setRawBookings(await res.json());
    } catch (e) { console.error('Load bookings error:', e); }
    finally { setLoadingBookings(false); }
  }, [selectedDate]);

  useEffect(() => { if (isOpen && masters.length > 0) loadBookings(); }, [isOpen, masters.length, loadBookings]);

  const calendarResources: CalendarResource[] = useMemo(() =>
    masters.map(m => ({ id: m.id, name: m.name, avatar: m.avatar, color: m.color || '#87C2CA' })),
    [masters]
  );

  const calendarEvents: CalendarEvent[] = useMemo(() => rawBookings.map(b => {
    const [sh, sm] = b.time.split(':').map(Number);
    let eh: number, em: number;
    if (b.timeEnd) { [eh, em] = b.timeEnd.split(':').map(Number); }
    else { const d = new Date(2000, 0, 1, sh, sm); d.setMinutes(d.getMinutes() + b.duration); eh = d.getHours(); em = d.getMinutes(); }
    return {
      id: b.id, text: b.serviceName || 'Запис',
      start: `${b.date}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`,
      end: `${b.date}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`,
      resource: b.masterId || '',
      clientName: b.clientName, clientPhone: b.clientPhone,
      serviceName: b.serviceName || undefined, masterName: b.masterName || undefined,
      status: b.status?.toLowerCase(),
    };
  }), [rawBookings]);

  const masterWorkingHours = useMemo(() => {
    const r: Record<string, Record<string, WorkingDay>> = {};
    masters.forEach(m => { if (m.workingHours) r[m.id] = m.workingHours; });
    return r;
  }, [masters]);

  const handleTimeRangeSelect = (_start: Date, _end: Date, resourceId: string) => {
    const master = masters.find(m => m.id === resourceId);
    if (master) { setAddForMasterId(master.id); setAddForMasterName(master.name); setAddModalOpen(true); }
  };

  const goToPrevDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); };
  const goToNextDay = () => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); };
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = `${ukDays[selectedDate.getDay()]}, ${selectedDate.getDate()} ${ukMonths[selectedDate.getMonth()]}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-white flex flex-col">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-white">
        <button onClick={onClose} className="p-2 -ml-2 rounded-xl hover:bg-gray-100"><X className="h-5 w-5" /></button>
        <div className="flex items-center gap-1">
          <button onClick={goToPrevDay} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setSelectedDate(new Date())}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isToday ? 'bg-black text-white' : 'hover:bg-gray-100'}`}>
            Сьогодні
          </button>
          <button onClick={goToNextDay} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <span className="text-sm font-medium text-gray-600 capitalize">{dateLabel}</span>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {(loading || loadingBookings) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/70">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && (
          <DayPilotResourceCalendar
            resources={calendarResources}
            events={calendarEvents}
            startDate={selectedDate}
            onDateChange={setSelectedDate}
            onTimeRangeSelect={handleTimeRangeSelect}
            timeStep={15}
            dayStartHour={8}
            dayEndHour={21}
            timezone={salonTimezone}
            viewMode="day"
            salonWorkingHours={salonWorkingHours}
            masterWorkingHours={masterWorkingHours}
          />
        )}
      </div>

      <Button
        className="fixed right-4 bottom-8 w-14 h-14 rounded-2xl shadow-lg z-[85] bg-gray-900 hover:bg-gray-800"
        size="icon"
        onClick={() => { if (masters.length > 0) { setAddForMasterId(masters[0].id); setAddForMasterName(masters[0].name); setAddModalOpen(true); } }}
      >
        <Plus className="h-7 w-7" />
      </Button>

      <StaffBookingModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        masterId={addForMasterId}
        salonId={salonId}
        masterName={addForMasterName}
        services={services}
        onSuccess={() => { setAddModalOpen(false); loadBookings(); }}
      />
    </div>
  );
}
