'use client';

import { useState, useEffect } from 'react';
import { X, Mail, CalendarDays, Loader2, Trash2, ChevronRight } from 'lucide-react';

interface MasterStats {
  todayCount: number;
  totalClients: number;
  monthBookings: number;
  todayBookings: { id: string; clientName: string; serviceName: string; time: string; timeEnd?: string; duration: number; status: string }[];
  tomorrowBookings: { id: string; clientName: string; serviceName: string; time: string; timeEnd?: string; duration: number; status: string }[];
}

interface Master {
  id: string;
  name: string;
  email?: string;
  role?: string;
  color?: string;
}

interface MasterCardPanelProps {
  isOpen: boolean;
  onClose: () => void;
  master: Master | null;
  canDelete?: boolean;
  onDelete?: (masterId: string) => void;
  isDeleting?: boolean;
}

export function MasterCardPanel({ isOpen, onClose, master, canDelete, onDelete, isDeleting }: MasterCardPanelProps) {
  const [masterStats, setMasterStats] = useState<MasterStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (isOpen && master) {
      setLoadingStats(true);
      fetch(`/api/masters/${master.id}/stats`)
        .then(r => r.json())
        .then(data => setMasterStats(data))
        .catch(() => setMasterStats(null))
        .finally(() => setLoadingStats(false));
    }
  }, [isOpen, master?.id]);

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[140] transition-opacity duration-500 ease-out ${
          isOpen && master ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 lg:w-[420px] bg-background z-[145] transform transition-transform duration-500 ease-out will-change-transform ${
          isOpen && master ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {master && (
          <div className="flex flex-col h-full">

            {/* Header — clean, minimal */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-4">
                <div 
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                  style={{ backgroundColor: master.color || '#71717a' }}
                >
                  {master.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">{master.name}</h2>
                  <p className="text-sm text-muted-foreground">{master.role || 'Майстер'}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Contact */}
            {master.email && (
              <div className="px-5 py-3 border-b">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{master.email}</span>
                </div>
              </div>
            )}

            {/* Stats row — monochrome */}
            <div className="px-5 py-4 border-b">
              <div className="grid grid-cols-3 divide-x">
                <div className="text-center pr-3">
                  <p className="text-2xl font-bold tracking-tight">
                    {loadingStats ? '–' : masterStats?.todayCount ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Сьогодні</p>
                </div>
                <div className="text-center px-3">
                  <p className="text-2xl font-bold tracking-tight">
                    {loadingStats ? '–' : masterStats?.totalClients ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Клієнтів</p>
                </div>
                <div className="text-center pl-3">
                  <p className="text-2xl font-bold tracking-tight">
                    {loadingStats ? '–' : masterStats?.monthBookings ?? 0}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">За місяць</p>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="flex-1 overflow-y-auto">
              {/* Today */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Сьогодні</p>
              </div>
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : masterStats?.todayBookings && masterStats.todayBookings.length > 0 ? (
                <div className="px-5">
                  {masterStats.todayBookings.map((b, i) => (
                    <div key={b.id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t' : ''}`}>
                      <div className="w-[72px] shrink-0">
                        <p className="text-sm font-medium tabular-nums">{b.time}</p>
                        {b.timeEnd && <p className="text-[11px] text-muted-foreground tabular-nums">{b.timeEnd}</p>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.clientName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{b.serviceName}</p>
                      </div>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        b.status === 'COMPLETED' ? 'bg-green-500' :
                        b.status === 'CONFIRMED' ? 'bg-blue-500' :
                        'bg-gray-300'
                      }`} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Немає записів</p>
                </div>
              )}

              {/* Tomorrow */}
              {masterStats?.tomorrowBookings && masterStats.tomorrowBookings.length > 0 && (
                <>
                  <div className="px-5 pt-5 pb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Завтра</p>
                  </div>
                  <div className="px-5 pb-4">
                    {masterStats.tomorrowBookings.map((b, i) => (
                      <div key={b.id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t' : ''}`}>
                        <div className="w-[72px] shrink-0">
                          <p className="text-sm font-medium tabular-nums">{b.time}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{b.clientName}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{b.serviceName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Delete */}
            {canDelete && onDelete && (
              <div className="p-4 border-t">
                <button 
                  onClick={() => onDelete(master.id)}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Видалити</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
