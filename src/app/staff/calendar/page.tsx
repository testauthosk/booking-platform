'use client';

import { useState, useEffect, Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { staffFetch } from '@/lib/staff-fetch';
import { ColleagueCalendarModal } from '@/components/staff/colleague-calendar-modal';

const StaffTimelineView = lazy(() => import('./timeline-view'));
const StaffGridView = lazy(() => import('./grid-view'));

function ViewModeSegment({ viewMode, onChange }: { viewMode: 'list' | 'grid'; onChange: (v: 'list' | 'grid') => void }) {
  return (
    <div
      className="relative"
      style={{
        height: '40px',
        padding: '3px',
        borderRadius: '12px',
        backgroundColor: '#f3f4f6',
        border: '1px solid rgba(0,0,0,0.15)',
        display: 'inline-flex',
        minWidth: '180px',
      }}
    >
      <div className="relative flex items-center" style={{ height: '100%', width: '100%' }}>
        <div
          className="absolute pointer-events-none"
          style={{
            top: 0, bottom: 0, width: '50%', left: 0,
            transform: viewMode === 'list' ? 'translateX(0%)' : 'translateX(100%)',
            transition: 'transform 300ms cubic-bezier(0.25, 0.1, 0.25, 1)',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '9px', backgroundColor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
        </div>
        <button
          className="relative z-10 flex items-center justify-center whitespace-nowrap"
          style={{ width: '50%', height: '100%', fontSize: '13px', fontWeight: 600, color: viewMode === 'list' ? '#111827' : '#6b7280', transition: 'color 200ms', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => onChange('list')}
        >
          Список
        </button>
        <button
          className="relative z-10 flex items-center justify-center whitespace-nowrap"
          style={{ width: '50%', height: '100%', fontSize: '13px', fontWeight: 600, color: viewMode === 'grid' ? '#111827' : '#6b7280', transition: 'color 200ms', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => onChange('grid')}
        >
          Сітка
        </button>
      </div>
    </div>
  );
}

export default function StaffCalendarPage() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [colleagueOpen, setColleagueOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await staffFetch('/api/staff/profile');
        if (res.ok) {
          const data = await res.json();
          setStaffId(data.id);
          setSalonId(data.salonId);
        }
      } catch {}
    };
    loadProfile();
  }, []);

  const fallback = (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Floating view mode toggle */}
      <div className="absolute top-3 right-3 z-50">
        <ViewModeSegment viewMode={viewMode} onChange={setViewMode} />
      </div>

      <Suspense fallback={fallback}>
        {viewMode === 'list' ? (
          <StaffTimelineView />
        ) : (
          <StaffGridView onColleagueCalendar={() => setColleagueOpen(true)} />
        )}
      </Suspense>

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
