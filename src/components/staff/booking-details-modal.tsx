'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Calendar, Users, ChevronRight, Loader2, Phone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Booking {
  id: string;
  clientName: string;
  clientPhone?: string;
  serviceName: string;
  time: string;
  timeEnd?: string;
  duration: number;
  status: string;
  price?: number;
}

interface Colleague {
  id: string;
  name: string;
  avatar?: string;
}

interface BookingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  accentColor: string;
  salonId: string;
  staffId: string;
  onStatusChange: () => void;
}

export function BookingDetailsModal({
  isOpen,
  onClose,
  booking,
  accentColor,
  salonId,
  staffId,
  onStatusChange,
}: BookingDetailsModalProps) {
  const router = useRouter();
  
  // Анімація
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Transfer modal
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);
  
  // Client card
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [loadingClient, setLoadingClient] = useState(false);

  // Анімація відкриття/закриття
  useEffect(() => {
    if (isOpen && booking) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTransferModalOpen(false);
        setClientCardOpen(false);
        setSelectedColleague(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, booking]);

  const loadColleagues = async () => {
    try {
      const res = await fetch(`/api/masters?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setColleagues(data.filter((m: any) => m.id !== staffId));
      }
    } catch (e) {}
  };

  const loadClientData = async () => {
    if (!booking?.clientPhone) return;
    setLoadingClient(true);
    try {
      const res = await fetch(`/api/clients/by-phone?phone=${encodeURIComponent(booking.clientPhone)}&salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setClientData(data);
      }
    } catch (e) {
      console.error('Error loading client:', e);
    } finally {
      setLoadingClient(false);
    }
  };

  const openClientCard = () => {
    loadClientData();
    setClientCardOpen(true);
  };

  const handleTransfer = async () => {
    if (!selectedColleague || !booking) return;
    setTransferring(true);
    try {
      const colleague = colleagues.find(c => c.id === selectedColleague);
      const res = await fetch('/api/staff/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: booking.id, 
          masterId: selectedColleague,
          masterName: colleague?.name,
        }),
      });
      if (res.ok) {
        setTransferModalOpen(false);
        onClose();
        onStatusChange();
      }
    } catch (e) {}
    setTransferring(false);
  };

  const handleStatusChange = async (status: string) => {
    if (!booking) return;
    if (status === 'CANCELLED' && !confirm('Скасувати цей запис?')) return;
    
    try {
      const res = await fetch('/api/staff/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, status }),
      });
      if (res.ok) {
        onClose();
        onStatusChange();
      }
    } catch (e) {}
  };

  const getEndTime = () => {
    if (!booking) return '';
    if (booking.timeEnd) return booking.timeEnd;
    const [h, m] = booking.time.split(':').map(Number);
    const endMin = h * 60 + m + booking.duration;
    return `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 400ms ease-out',
        }}
        onClick={onClose}
      />
      
      {/* Main Modal */}
      <div 
        className="fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-[110] max-h-[85vh] overflow-hidden flex flex-col"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {booking && (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="font-semibold text-lg">Деталі запису</h2>
              <button 
                onClick={onClose}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Time & Status */}
              <div className="flex items-center justify-between">
                <div 
                  className="px-4 py-2 rounded-xl text-lg font-bold"
                  style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                  {booking.time} — {getEndTime()}
                </div>
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                  booking.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {booking.status === 'COMPLETED' ? 'Виконано' :
                   booking.status === 'CANCELLED' ? 'Скасовано' : 'Очікує'}
                </span>
              </div>

              {/* Client - CLICKABLE */}
              <button
                onClick={openClientCard}
                className="w-full p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: accentColor }}
                  >
                    {booking.clientName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{booking.clientName}</p>
                    <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>

              {/* Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Тривалість</p>
                  <p className="font-semibold">{booking.duration} хв</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Вартість</p>
                  <p className="font-semibold">{booking.price || 0} ₴</p>
                </div>
              </div>

              {/* Quick Actions */}
              {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      router.push(`/staff/calendar?bookingId=${booking.id}&time=${booking.time}`);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Відкрити в календарі</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </button>
                  
                  <button
                    onClick={() => {
                      loadColleagues();
                      setTransferModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
                  >
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Передати колезі</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-auto" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            {booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED' && (
              <div className="p-4 border-t flex gap-2 shrink-0">
                <button
                  onClick={() => handleStatusChange('CANCELLED')}
                  className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 transition-colors"
                >
                  Скасувати
                </button>
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  className="flex-1 py-3 rounded-xl font-medium transition-colors text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Виконано ✓
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Transfer Modal */}
      <div 
        className="fixed inset-0 bg-black/40 z-[120]"
        style={{
          opacity: transferModalOpen ? 1 : 0,
          pointerEvents: transferModalOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}
        onClick={() => setTransferModalOpen(false)}
      />
      <div 
        className="fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-[130] max-h-[70vh] overflow-hidden flex flex-col"
        style={{
          transform: transferModalOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-semibold">Передати запис</h3>
            <p className="text-sm text-muted-foreground">Оберіть колегу</p>
          </div>
          <button 
            onClick={() => setTransferModalOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {colleagues.length > 0 ? colleagues.map((colleague) => (
            <button
              key={colleague.id}
              onClick={() => setSelectedColleague(colleague.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                selectedColleague === colleague.id ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
            >
              <div 
                className="h-12 w-12 rounded-full flex items-center justify-center text-white font-medium text-lg overflow-hidden"
                style={{ backgroundColor: accentColor }}
              >
                {colleague.avatar ? (
                  <img src={colleague.avatar} alt="" className="h-12 w-12 object-cover" />
                ) : (
                  colleague.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-medium text-lg">{colleague.name}</span>
              {selectedColleague === colleague.id && (
                <Check className="h-6 w-6 ml-auto" style={{ color: accentColor }} />
              )}
            </button>
          )) : (
            <p className="text-center py-8 text-muted-foreground">Немає колег</p>
          )}
        </div>
        <div className="p-4 border-t flex gap-2 shrink-0">
          <button
            onClick={() => setTransferModalOpen(false)}
            className="flex-1 py-3 rounded-xl bg-muted hover:bg-muted/80 font-medium"
          >
            Скасувати
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedColleague || transferring}
            className="flex-1 py-3 rounded-xl text-white font-medium disabled:opacity-50"
            style={{ backgroundColor: accentColor }}
          >
            {transferring ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Передати'}
          </button>
        </div>
      </div>

      {/* Client Card - Slide from Right */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[120]"
        style={{
          opacity: clientCardOpen ? 1 : 0,
          pointerEvents: clientCardOpen ? 'auto' : 'none',
          transition: 'opacity 300ms ease-out',
        }}
        onClick={() => setClientCardOpen(false)}
      />
      <div 
        className="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-background shadow-2xl z-[130] flex flex-col overflow-hidden"
        style={{
          transform: clientCardOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 350ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {loadingClient ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : booking ? (
          <>
            {/* Header with gradient */}
            <div 
              className="relative p-6 pb-4"
              style={{ background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}05)` }}
            >
              <button
                onClick={() => setClientCardOpen(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-black/10 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-4">
                <div 
                  className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                  style={{ backgroundColor: accentColor }}
                >
                  {booking.clientName.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{booking.clientName}</h2>
                  {booking.clientPhone && (
                    <p className="text-muted-foreground mt-1">{booking.clientPhone}</p>
                  )}
                </div>
              </div>

              {/* Quick action */}
              {booking.clientPhone && (
                <a
                  href={`tel:${booking.clientPhone}`}
                  className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 rounded-xl text-white font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  <Phone className="h-4 w-4" />
                  Зателефонувати
                </a>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 p-4 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold">{clientData?.totalVisits || 0}</p>
                <p className="text-xs text-muted-foreground">Візитів</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{(clientData?.totalSpent || 0).toLocaleString()} ₴</p>
                <p className="text-xs text-muted-foreground">Витрачено</p>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Last visits */}
              {clientData?.lastVisits && clientData.lastVisits.length > 0 && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-3">Останні візити</h3>
                  <div className="space-y-2">
                    {clientData.lastVisits.slice(0, 10).map((visit: any) => (
                      <div key={visit.id} className="p-3 rounded-xl bg-muted/30 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{visit.serviceName}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(visit.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                          </p>
                        </div>
                        <p className="font-semibold">{visit.price || 0} ₴</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No visits */}
              {(!clientData?.lastVisits || clientData.lastVisits.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Немає історії візитів</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
