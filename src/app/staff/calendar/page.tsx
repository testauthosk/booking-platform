'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { staffFetch } from '@/lib/staff-fetch';
import { Loader2, List, Grid3X3, ChevronLeft, Plus, CalendarDays } from 'lucide-react';
import StaffTimelineView from './timeline-view';
import StaffGridView from './grid-view';
import { ColleagueCalendarModal } from '@/components/staff/colleague-calendar-modal';

// Vertical segment toggle — fixed bottom-right
function ViewModeToggle({ viewMode, onChange }: { viewMode: 'list' | 'grid'; onChange: (v: 'list' | 'grid') => void }) {
  return (
    <div className="fixed right-4 bottom-[100px] z-50 flex flex-col gap-0 rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 bg-white/90 backdrop-blur-md">
      <button
        onClick={() => onChange('list')}
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
        onClick={() => onChange('grid')}
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
  );
}

function StaffCalendarContent() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [colleagueOpen, setColleagueOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative overflow-hidden">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>}>
        {viewMode === 'list' ? (
          <StaffTimelineView />
        ) : (
          <StaffGridView onColleagueCalendar={() => setColleagueOpen(true)} />
        )}
      </Suspense>

      {/* Vertical view mode toggle — bottom right */}
      <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />

      {/* Colleague calendar fullscreen */}
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
