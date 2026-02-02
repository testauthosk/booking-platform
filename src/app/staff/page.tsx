'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, LogOut, User, Loader2, Plus, ChevronRight, Users, TrendingUp } from 'lucide-react';

interface Booking {
  id: string;
  clientName: string;
  serviceName: string;
  time: string;
  timeEnd?: string;
  duration: number;
  status: string;
  price?: number;
}

interface StaffStats {
  todayCount: number;
  tomorrowCount: number;
  weekCount: number;
  totalClients: number;
  todayBookings: Booking[];
  nextBooking?: Booking;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const name = localStorage.getItem('staffName');
    const id = localStorage.getItem('staffId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffName(name || 'Майстер');
    setStaffId(id || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (staffId) {
      loadStats();
    }
  }, [staffId]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`/api/staff/dashboard?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffId');
    localStorage.removeItem('staffName');
    router.push('/staff/login');
  };

  const getTimeUntil = (time: string) => {
    const now = new Date();
    const [hours, minutes] = time.split(':').map(Number);
    const bookingTime = new Date();
    bookingTime.setHours(hours, minutes, 0, 0);
    
    const diff = bookingTime.getTime() - now.getTime();
    if (diff < 0) return null;
    
    const diffMinutes = Math.floor(diff / 60000);
    if (diffMinutes < 60) return `через ${diffMinutes} хв`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `через ${diffHours} год`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Доброго ранку' : currentHour < 18 ? 'Добрий день' : 'Добрий вечір';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {staffName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-lg">{staffName}</p>
              <p className="text-sm text-muted-foreground">Особистий кабінет</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <LogOut className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-5 pb-24">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">{greeting}!</h1>
          <p className="text-muted-foreground">
            {stats?.todayCount 
              ? `У вас ${stats.todayCount} ${stats.todayCount === 1 ? 'запис' : stats.todayCount < 5 ? 'записи' : 'записів'} сьогодні`
              : 'Сьогодні вільний день'}
          </p>
        </div>

        {/* Next booking highlight */}
        {stats?.nextBooking && (
          <Card className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">Наступний запис</span>
              {getTimeUntil(stats.nextBooking.time) && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                  {getTimeUntil(stats.nextBooking.time)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center text-orange-600 font-bold shadow-sm">
                {stats.nextBooking.time}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{stats.nextBooking.clientName}</p>
                <p className="text-sm text-muted-foreground">{stats.nextBooking.serviceName}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold text-primary">
              {loadingStats ? '...' : stats?.todayCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Сьогодні</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.tomorrowCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">Завтра</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.weekCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">За тиждень</p>
          </Card>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => router.push('/staff/calendar')}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <p className="font-medium">Мій календар</p>
            <p className="text-xs text-muted-foreground">Розклад записів</p>
          </Card>

          <Card 
            className="p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => router.push('/staff/schedule')}
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <p className="font-medium">Графік роботи</p>
            <p className="text-xs text-muted-foreground">Робочі години</p>
          </Card>
        </div>

        {/* Today's appointments */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Записи на сьогодні</h2>
            <button 
              onClick={() => router.push('/staff/calendar?action=new')}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Додати
            </button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats?.todayBookings && stats.todayBookings.length > 0 ? (
            <div className="space-y-3">
              {stats.todayBookings.map((booking, index) => {
                const isPast = (() => {
                  const [h, m] = booking.time.split(':').map(Number);
                  const now = new Date();
                  return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                })();
                
                return (
                  <Card 
                    key={booking.id}
                    className={`p-4 transition-all ${isPast ? 'opacity-60' : ''} ${
                      booking.status === 'COMPLETED' ? 'border-green-200 bg-green-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Time block */}
                      <div className={`h-14 w-14 rounded-xl flex flex-col items-center justify-center ${
                        isPast ? 'bg-muted' : 'bg-primary/10'
                      }`}>
                        <span className={`text-lg font-bold ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
                          {booking.time.split(':')[0]}:{booking.time.split(':')[1]}
                        </span>
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{booking.clientName}</p>
                          {booking.status === 'COMPLETED' && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">
                              ✓
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{booking.serviceName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {booking.duration} хв
                          </span>
                          {booking.price && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-xs font-medium">{booking.price} ₴</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">Немає записів</p>
              <p className="text-sm text-muted-foreground mb-4">Сьогодні у вас вільний день</p>
              <button 
                onClick={() => router.push('/staff/calendar?action=new')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Створити запис
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
