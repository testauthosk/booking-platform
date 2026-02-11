'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { staffFetch } from '@/lib/staff-fetch';
import { Loader2, List, Grid3X3, ChevronLeft, Plus, CalendarDays, Users } from 'lucide-react';
import StaffTimelineView from './timeline-view';
import StaffGridView from './grid-view';
import { ColleagueCalendarModal } from '@/components/staff/colleague-calendar-modal';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';

function StaffCalendarContent() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [colleagueOpen, setColleagueOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [salonId, setSalonId] = useState('');
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Date picker
  const [showDatePicker, setShowDatePicker] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Selected date (shared between views)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Reload trigger for child views
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const localStaffId = localStorage.getItem('staffId');
        const localSalonId = localStorage.getItem('staffSalonId');
        
        if (localStaffId) setStaffId(localStaffId);
        if (localSalonId) setSalonId(localSalonId);
        
        const res = await staffFetch('/api/staff/profile');
        if (res.ok) {
          const data = await res.json();
          setStaffId(data.id);
          setStaffName(data.name || '');
          setSalonId(data.salonId);
        }
      } catch {
        // localStorage fallback
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Load services for booking modal
  useEffect(() => {
    if (!staffId) return;
    staffFetch('/api/staff/services').then(res => {
      if (res.ok) return res.json();
    }).then(data => {
      if (Array.isArray(data)) setServices(data);
    }).catch(() => {});
  }, [staffId]);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dayNames = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  const monthNames = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

  const goToToday = () => setSelectedDate(new Date());

  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker?.();
      dateInputRef.current.click();
    }
  };

  const handleDatePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      const [y, m, d] = e.target.value.split('-').map(Number);
      setSelectedDate(new Date(y, m - 1, d));
    }
  };

  const handleBookingSuccess = () => {
    setAddModalOpen(false);
    setReloadKey(k => k + 1);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const subtitle = isToday
    ? 'Сьогодні'
    : `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]}, ${dayNames[selectedDate.getDay()]}`;

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      {/* === UNIFIED HEADER === */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push('/staff')} className="p-1 -ml-1 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Мій календар</h1>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Date picker */}
          <button
            onClick={openDatePicker}
            className="w-10 h-10 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Обрати дату"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
          {/* Hidden native date input */}
          <input
            ref={dateInputRef}
            type="date"
            className="absolute opacity-0 w-0 h-0 pointer-events-none"
            value={`${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`}
            onChange={handleDatePickerChange}
          />
          {/* Today button */}
          {!isToday && (
            <button
              onClick={goToToday}
              className="px-3 h-10 rounded-2xl bg-gray-900 text-white text-sm font-medium flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              Сьогодні
            </button>
          )}
        </div>
      </div>

      {/* === CALENDAR VIEW === */}
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
        {viewMode === 'list' ? (
          <StaffTimelineView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            reloadKey={reloadKey}
          />
        ) : (
          <StaffGridView
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            reloadKey={reloadKey}
          />
        )}
      </Suspense>

      {/* === BOTTOM RIGHT BUTTONS === */}
      <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-2 items-center">
        {/* Add booking */}
        <button
          onClick={() => setAddModalOpen(true)}
          className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-lg hover:bg-gray-800 transition-all active:scale-95"
          title="Новий запис"
        >
          <Plus className="h-6 w-6" />
        </button>
        {/* Colleague booking */}
        <button
          onClick={() => setColleagueOpen(true)}
          className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all active:scale-95"
          title="Записати колегу"
        >
          <Users className="h-5 w-5" />
        </button>
        {/* View mode toggle */}
        <div className="flex flex-col gap-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 bg-white/90 backdrop-blur-md">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              viewMode === 'list'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title="Список"
          >
            <List className="h-5 w-5" />
          </button>
          <div className="h-px bg-gray-200" />
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center justify-center w-12 h-12 transition-all ${
              viewMode === 'grid'
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
            title="Сітка"
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* === MODALS === */}
      <StaffBookingModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        masterId={staffId}
        salonId={salonId}
        masterName={staffName}
        services={services}
        onSuccess={handleBookingSuccess}
      />

      <ColleagueCalendarModal
        isOpen={colleagueOpen}
        onClose={() => setColleagueOpen(false)}
        staffId={staffId}
        salonId={salonId}
      />
    </div>
  );
}

export default function StaffCalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <StaffCalendarContent />
    </Suspense>
  );
}
