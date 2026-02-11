'use client';

import { useState, useEffect, Suspense } from 'react';
import { staffFetch } from '@/lib/staff-fetch';
import { Loader2, List, Grid3X3, Plus, Users } from 'lucide-react';
import StaffTimelineView from './timeline-view';
import StaffGridView from './grid-view';
import { ColleagueCalendarModal } from '@/components/staff/colleague-calendar-modal';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';

function StaffCalendarContent() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('staff-calendar-view') as 'list' | 'grid') || 'grid';
    }
    return 'grid';
  });
  
  // Persist view mode
  useEffect(() => {
    localStorage.setItem('staff-calendar-view', viewMode);
  }, [viewMode]);
  const [colleagueOpen, setColleagueOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [salonId, setSalonId] = useState('');
  const [services, setServices] = useState<{ id: string; name: string; duration: number; price: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Calendar picker handled by each view internally

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

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      {/* Calendar view */}
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
            onAddBooking={() => setAddModalOpen(true)}
            reloadKey={reloadKey}
          />
        )}
      </Suspense>

      {/* Bottom right buttons */}
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
        {/* View mode toggle with sliding indicator */}
        <div className="relative flex flex-col gap-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 bg-white/90 backdrop-blur-md">
          {/* Sliding indicator */}
          <div
            className="absolute left-0 right-0 h-12 bg-gray-900 rounded-2xl z-0 pointer-events-none"
            style={{
              transform: `translateY(${viewMode === 'list' ? '0' : '100'}%)`,
              transition: 'transform 0.3s ease',
            }}
          />
          <button
            onClick={() => setViewMode('list')}
            className={`relative z-10 flex items-center justify-center w-12 h-12 transition-colors duration-300 ${
              viewMode === 'list' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Список"
          >
            <List className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`relative z-10 flex items-center justify-center w-12 h-12 transition-colors duration-300 ${
              viewMode === 'grid' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Сітка"
          >
            <Grid3X3 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Modals */}
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
