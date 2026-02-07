'use client';

import { useState, useEffect } from 'react';
import { X, Mail, CalendarDays, Loader2, Trash2, Clock } from 'lucide-react';

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
  /** If true, show delete button */
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
        className={`fixed inset-0 bg-black/60 z-[140] transition-opacity duration-[560ms] ease-out ${
          isOpen && master ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-full sm:w-96 lg:w-[420px] bg-card shadow-2xl z-[145] transform transition-transform duration-[560ms] ease-out will-change-transform ${
          isOpen && master ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {master && (
          <div className="flex flex-col h-full pb-20 lg:pb-0">
            {/* Hero header */}
            <div className="relative p-5 pb-4" style={{ background: `linear-gradient(135deg, ${master.color || '#f97316'}dd, ${master.color || '#f97316'}88)` }}>
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-4 mt-2">
                <div className="h-18 w-18 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-3xl font-bold" style={{ width: 72, height: 72 }}>
                  {master.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-bold text-white">{master.name}</p>
                  <p className="text-sm text-white/70">{master.role || 'Майстер'}</p>
                  {master.email && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-white/60">
                      <Mail className="h-3 w-3" />
                      <span>{master.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {loadingStats ? '·' : masterStats?.todayCount ?? 0}
                  </p>
                  <p className="text-[10px] font-medium text-blue-600 mt-0.5">Сьогодні</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 text-center">
                  <p className="text-2xl font-bold text-emerald-700">
                    {loadingStats ? '·' : masterStats?.totalClients ?? 0}
                  </p>
                  <p className="text-[10px] font-medium text-emerald-600 mt-0.5">Клієнтів</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-50 to-violet-100/50 text-center">
                  <p className="text-2xl font-bold text-violet-700">
                    {loadingStats ? '·' : masterStats?.monthBookings ?? 0}
                  </p>
                  <p className="text-[10px] font-medium text-violet-600 mt-0.5">За місяць</p>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="flex-1 p-4 overflow-y-auto">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Розклад на сьогодні
              </p>
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : masterStats?.todayBookings && masterStats.todayBookings.length > 0 ? (
                <div className="space-y-2">
                  {masterStats.todayBookings.map((booking) => (
                    <div 
                      key={booking.id}
                      className="p-3 rounded-xl bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{booking.time}{booking.timeEnd ? ` - ${booking.timeEnd}` : ''}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          booking.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status === 'COMPLETED' ? 'Завершено' :
                           booking.status === 'CONFIRMED' ? 'Підтверджено' : booking.status}
                        </span>
                      </div>
                      <p className="text-sm">{booking.clientName}</p>
                      <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Немає записів на сьогодні</p>
                </div>
              )}

              {/* Tomorrow preview */}
              {masterStats?.tomorrowBookings && masterStats.tomorrowBookings.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4 mb-3">
                    Завтра ({masterStats.tomorrowBookings.length})
                  </p>
                  <div className="space-y-2">
                    {masterStats.tomorrowBookings.slice(0, 3).map((booking) => (
                      <div 
                        key={booking.id}
                        className="p-2 rounded-lg bg-muted/20 border border-border/30"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{booking.time}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="truncate">{booking.clientName}</span>
                        </div>
                      </div>
                    ))}
                    {masterStats.tomorrowBookings.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{masterStats.tomorrowBookings.length - 3} ще
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Delete */}
            {canDelete && onDelete && (
              <div className="p-4 border-t border-border">
                <button 
                  onClick={() => onDelete(master.id)}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  <span>Видалити майстра</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
