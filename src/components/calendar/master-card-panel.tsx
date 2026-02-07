'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Users, Calendar, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MasterStats {
  todayCount: number;
  totalClients: number;
  monthBookings: number;
  todayBookings: { id: string; clientName: string; serviceName: string; time: string; timeEnd: string; duration: number; status: string }[];
  tomorrowBookings: { id: string; clientName: string; serviceName: string; time: string; timeEnd: string; duration: number; status: string }[];
}

interface MasterInfo {
  id: string;
  name: string;
  email?: string;
  role?: string;
  avatar?: string;
  color?: string;
  rating?: number;
  reviewCount?: number;
}

interface MasterCardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  masterId: string;
  salonId: string;
}

export function MasterCardPanel({ isOpen, onClose, masterId, salonId }: MasterCardPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [master, setMaster] = useState<MasterInfo | null>(null);
  const [stats, setStats] = useState<MasterStats | null>(null);
  const [loading, setLoading] = useState(true);

  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const deltaY = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Swipe down to close
  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    const applyFrame = () => {
      if (!isDragging.current) return;
      const d = Math.max(0, deltaY.current);
      sheet.style.transform = `translate3d(0,${d}px,0)`;
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      deltaY.current = 0;
      isDragging.current = true;
      sheet.style.transition = 'none';
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      deltaY.current = e.touches[0].clientY - touchStartY.current;
    };

    const onEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      cancelAnimationFrame(rafId.current);

      sheet.style.transition = 'transform 600ms cubic-bezier(0.2,0,0,1)';
      if (deltaY.current > 80) {
        sheet.style.transform = `translate3d(0,${window.innerHeight}px,0)`;
        setTimeout(() => onCloseRef.current(), 600);
      } else {
        sheet.style.transform = 'translate3d(0,0,0)';
      }
    };

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: true });
    handle.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  // Load data
  useEffect(() => {
    if (!isOpen || !masterId || !salonId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/masters?salonId=${salonId}`).then(r => r.json()),
      fetch(`/api/masters/${masterId}/stats`).then(r => r.json()),
    ]).then(([masters, statsData]) => {
      const found = Array.isArray(masters) ? masters.find((m: any) => m.id === masterId) : null;
      setMaster(found || null);
      setStats(statsData?.todayCount !== undefined ? statsData : null);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isOpen, masterId, salonId]);

  if (!isVisible) return null;

  const initials = master?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?';

  return (
    <>
      <div
        className="fixed inset-0 bg-black/80 z-[130]"
        style={{ opacity: isAnimating ? 1 : 0, transition: 'opacity 500ms ease-out' }}
        onClick={onClose}
      />

      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 bg-background shadow-xl z-[135] overflow-hidden flex flex-col rounded-t-3xl"
        style={{
          maxHeight: '85vh',
          transform: isAnimating ? 'translate3d(0,0,0)' : 'translate3d(0,100%,0)',
          transition: 'transform 600ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Handle */}
        <div ref={handleRef} className="px-4 pt-3 pb-3 border-b flex flex-col shrink-0" style={{ touchAction: 'none' }}>
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Картка майстра</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/80 shadow-md border flex items-center justify-center">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : !master ? (
            <p className="text-center text-muted-foreground py-8">Майстра не знайдено</p>
          ) : (
            <>
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold"
                  style={{ backgroundColor: master.color || '#6366f1' }}
                >
                  {initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{master.name}</h3>
                  {master.role && <p className="text-sm text-muted-foreground capitalize">{master.role}</p>}
                  {master.rating && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-medium">{master.rating}</span>
                      {master.reviewCount && (
                        <span className="text-xs text-muted-foreground">({master.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats cards */}
              {stats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-blue-50 text-center">
                    <Calendar className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-blue-700">{stats.todayCount}</p>
                    <p className="text-[10px] text-blue-600">Сьогодні</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-50 text-center">
                    <Users className="h-4 w-4 text-green-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-green-700">{stats.totalClients}</p>
                    <p className="text-[10px] text-green-600">Клієнтів</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-50 text-center">
                    <Calendar className="h-4 w-4 text-violet-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-violet-700">{stats.monthBookings}</p>
                    <p className="text-[10px] text-violet-600">Цей місяць</p>
                  </div>
                </div>
              )}

              {/* Today's bookings */}
              {stats && stats.todayBookings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Записи сьогодні</h4>
                  <div className="space-y-2">
                    {stats.todayBookings.map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border">
                        <div className="text-sm font-mono text-muted-foreground w-[90px] shrink-0">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {b.time}–{b.timeEnd || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.serviceName}</p>
                        </div>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0",
                          b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {b.status === 'CONFIRMED' ? '✓' : '⏳'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tomorrow's bookings */}
              {stats && stats.tomorrowBookings.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Записи завтра</h4>
                  <div className="space-y-2">
                    {stats.tomorrowBookings.map(b => (
                      <div key={b.id} className="flex items-center gap-3 p-2.5 rounded-xl border">
                        <div className="text-sm font-mono text-muted-foreground w-[90px] shrink-0">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {b.time}–{b.timeEnd || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{b.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{b.serviceName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
