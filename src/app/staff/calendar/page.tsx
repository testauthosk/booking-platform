'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Plus, Loader2, Clock, User } from 'lucide-react';

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  time: string;
  timeEnd?: string;
  duration: number;
  status: string;
  price?: number;
}

const DAYS_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

export default function StaffCalendar() {
  const router = useRouter();
  const daysRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Generate 14 days from today
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffId(id || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (staffId && selectedDate) {
      loadBookings();
    }
  }, [staffId, selectedDate]);

  // Scroll to today on mount
  useEffect(() => {
    if (daysRef.current) {
      const todayIndex = 0;
      const dayWidth = 64 + 8; // w-16 + gap
      daysRef.current.scrollLeft = todayIndex * dayWidth;
    }
  }, []);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/staff/bookings?masterId=${staffId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Load bookings error:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const formatDateHeader = (date: Date) => {
    if (isToday(date)) return 'Сьогодні';
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    return `${date.getDate()} ${MONTHS_UA[date.getMonth()]}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/staff')}
              className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Мій календар</h1>
              <p className="text-sm text-muted-foreground">{formatDateHeader(selectedDate)}</p>
            </div>
          </div>
          <button 
            onClick={() => {/* TODO: Open new booking modal */}}
            className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Days horizontal scroll */}
      <div 
        ref={daysRef}
        className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-hide bg-card border-b"
      >
        {days.map((date, index) => (
          <button
            key={index}
            onClick={() => setSelectedDate(date)}
            className={`flex flex-col items-center min-w-[56px] py-2 px-2 rounded-xl transition-all ${
              isSelected(date)
                ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                : isToday(date)
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            }`}
          >
            <span className="text-xs font-medium opacity-70">
              {DAYS_UA[date.getDay()]}
            </span>
            <span className="text-xl font-bold">
              {date.getDate()}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline view */}
      <div className="p-4 pb-24">
        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : bookings.length > 0 ? (
          <div className="relative">
            {/* Time line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-4">
              {bookings.map((booking, index) => {
                const isPast = (() => {
                  if (!isToday(selectedDate)) return false;
                  const [h, m] = booking.time.split(':').map(Number);
                  const now = new Date();
                  return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                })();
                
                return (
                  <div key={booking.id} className="flex gap-4 relative">
                    {/* Time dot */}
                    <div className="flex flex-col items-center z-10">
                      <div className={`h-3 w-3 rounded-full ${
                        booking.status === 'COMPLETED' 
                          ? 'bg-green-500' 
                          : isPast 
                          ? 'bg-muted-foreground' 
                          : 'bg-primary'
                      }`} />
                      <span className={`text-xs font-medium mt-1 ${
                        isPast ? 'text-muted-foreground' : ''
                      }`}>
                        {booking.time}
                      </span>
                    </div>
                    
                    {/* Booking card */}
                    <Card className={`flex-1 p-4 ${
                      booking.status === 'COMPLETED' 
                        ? 'border-green-200 bg-green-50/50' 
                        : isPast 
                        ? 'opacity-60' 
                        : ''
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold">{booking.clientName}</p>
                          <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                        </div>
                        {booking.status === 'COMPLETED' && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Завершено
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{booking.duration} хв</span>
                        </div>
                        {booking.price && (
                          <span className="font-medium text-foreground">{booking.price} ₴</span>
                        )}
                      </div>
                      
                      {/* Quick actions */}
                      {!isPast && booking.status !== 'COMPLETED' && (
                        <div className="flex gap-2 mt-3">
                          <button className="flex-1 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium hover:bg-green-200 transition-colors">
                            Завершити
                          </button>
                          <button className="flex-1 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                            Скасувати
                          </button>
                        </div>
                      )}
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">Немає записів</p>
            <p className="text-sm text-muted-foreground mb-6">
              На цей день ще немає записів
            </p>
            <button 
              onClick={() => {/* TODO: Open new booking modal */}}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Створити запис
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
