'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, LogOut, Settings, Loader2, Plus, ChevronRight, X, Tag, User, Phone, Check } from 'lucide-react';

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

interface ServiceOption {
  id: string;
  name: string;
  duration: number;
  price: number;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Services for booking form
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [newBookingOpen, setNewBookingOpen] = useState(false);
  
  // New booking form
  const [bookingService, setBookingService] = useState<ServiceOption | null>(null);
  const [bookingClientName, setBookingClientName] = useState('');
  const [bookingClientPhone, setBookingClientPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('');
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<'service' | 'details'>('service');

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const name = localStorage.getItem('staffName');
    const id = localStorage.getItem('staffId');
    const salon = localStorage.getItem('staffSalonId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffName(name || 'Майстер');
    setStaffId(id || '');
    setSalonId(salon || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (staffId) {
      loadStats();
      loadServices();
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

  const loadServices = async () => {
    try {
      const res = await fetch(`/api/staff/services?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        // Only enabled services
        setServices(data.filter((s: { isEnabled: boolean }) => s.isEnabled));
      }
    } catch (error) {
      console.error('Load services error:', error);
    }
  };

  const openNewBooking = () => {
    setBookingStep('service');
    setBookingService(null);
    setBookingClientName('');
    setBookingClientPhone('');
    setBookingDate(new Date().toISOString().split('T')[0]);
    setBookingTime('');
    openNewBooking();
  };

  const createBooking = async () => {
    if (!bookingService || !bookingClientName || !bookingClientPhone || !bookingDate || !bookingTime) return;
    
    setSavingBooking(true);
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId: staffId,
          serviceId: bookingService.id,
          clientName: bookingClientName,
          clientPhone: bookingClientPhone,
          serviceName: bookingService.name,
          masterName: staffName,
          date: bookingDate,
          time: bookingTime,
          duration: bookingService.duration,
          price: bookingService.price
        })
      });
      
      if (res.ok) {
        setNewBookingOpen(false);
        loadStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Create booking error:', error);
    } finally {
      setSavingBooking(false);
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
            onClick={() => setSettingsOpen(true)}
            className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4 pb-48">
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

        {/* Quick actions - compact */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
            onClick={() => router.push('/staff/calendar')}
          >
            <div className="h-10 w-10 rounded-xl bg-blue-100 flex flex-col items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-blue-600 leading-none">
                {new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }).replace('.', '/')}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Мій календар</p>
              <p className="text-xs text-muted-foreground truncate">Розклад</p>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
            onClick={() => router.push('/staff/services')}
          >
            <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <Tag className="h-5 w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm">Мої послуги</p>
              <p className="text-xs text-muted-foreground truncate">Ціни</p>
            </div>
          </Card>
        </div>

        {/* Today's appointments - horizontal timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Записи на сьогодні</h2>
            <button 
              onClick={() => openNewBooking()}
              className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1 hover:bg-primary/90 transition-colors active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats?.todayBookings && stats.todayBookings.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-3 pb-2" style={{ minWidth: 'min-content' }}>
                {stats.todayBookings.map((booking) => {
                  const isPast = (() => {
                    const [h, m] = booking.time.split(':').map(Number);
                    const now = new Date();
                    return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                  })();
                  
                  return (
                    <Card 
                      key={booking.id}
                      className={`p-3 min-w-[140px] max-w-[160px] shrink-0 transition-all ${isPast ? 'opacity-50' : ''} ${
                        booking.status === 'COMPLETED' ? 'border-green-300 bg-green-50' : ''
                      }`}
                    >
                      {/* Time badge */}
                      <div className={`inline-flex items-center px-2 py-1 rounded-lg text-sm font-bold mb-2 ${
                        isPast ? 'bg-muted text-muted-foreground' : 
                        booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                        'bg-primary/10 text-primary'
                      }`}>
                        {booking.time}
                      </div>
                      
                      {/* Client */}
                      <p className="font-semibold text-sm truncate mb-0.5">{booking.clientName}</p>
                      <p className="text-xs text-muted-foreground truncate mb-2">{booking.serviceName}</p>
                      
                      {/* Bottom row */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{booking.duration} хв</span>
                        {booking.price && (
                          <span className="font-medium">{booking.price} ₴</span>
                        )}
                      </div>
                    </Card>
                  );
                })}
                
                {/* Add button at the end */}
                <Card 
                  className="p-3 min-w-[100px] shrink-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
                  onClick={() => openNewBooking()}
                >
                  <Plus className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground">Додати</span>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="p-6 text-center">
              <div className="h-12 w-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-sm mb-1">Вільний день</p>
              <p className="text-xs text-muted-foreground mb-3">Записів немає</p>
              <button 
                onClick={() => openNewBooking()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Створити
              </button>
            </Card>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {settingsOpen && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40 transition-opacity duration-[560ms] ease-out"
          onClick={() => setSettingsOpen(false)}
        />
      )}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 transform transition-transform duration-[560ms] ease-out will-change-transform ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pb-20">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Налаштування</h2>
            <button 
              onClick={() => setSettingsOpen(false)}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-1">
            <button 
              onClick={() => { setSettingsOpen(false); router.push('/staff/profile'); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Мій профіль</p>
                <p className="text-xs text-muted-foreground">Фото, імʼя, контакти</p>
              </div>
            </button>

            <button 
              onClick={() => { setSettingsOpen(false); router.push('/staff/schedule'); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Графік роботи</p>
                <p className="text-xs text-muted-foreground">Робочі години</p>
              </div>
            </button>
          </div>

          <div className="p-4 border-t border-border">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Вийти</span>
            </button>
          </div>
        </div>
      </div>

      {/* New Booking Modal */}
      {newBookingOpen && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          onClick={() => setNewBookingOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-4 bottom-4 max-h-[80vh] bg-card rounded-2xl shadow-xl z-50 transform transition-all duration-300 ease-out overflow-hidden flex flex-col ${
          newBookingOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {bookingStep === 'details' && (
              <button 
                onClick={() => setBookingStep('service')}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
            )}
            <h2 className="font-semibold">
              {bookingStep === 'service' ? 'Оберіть послугу' : 'Деталі запису'}
            </h2>
          </div>
          <button 
            onClick={() => setNewBookingOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Select service */}
        {bookingStep === 'service' && (
          <div className="p-4 overflow-y-auto flex-1">
            {services.length > 0 ? (
              <div className="space-y-2">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setBookingService(service);
                      setBookingStep('details');
                    }}
                    className="w-full p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-left flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.duration} хв</p>
                    </div>
                    <span className="font-semibold">{service.price} ₴</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Немає активних послуг</p>
                <button 
                  onClick={() => { setNewBookingOpen(false); router.push('/staff/services'); }}
                  className="mt-2 text-primary text-sm"
                >
                  Налаштувати послуги
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Client details */}
        {bookingStep === 'details' && bookingService && (
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Selected service summary */}
            <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{bookingService.name}</p>
                <p className="text-xs text-muted-foreground">{bookingService.duration} хв</p>
              </div>
              <span className="font-semibold">{bookingService.price} ₴</span>
            </div>

            {/* Client name */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Імʼя клієнта</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={bookingClientName}
                  onChange={(e) => setBookingClientName(e.target.value)}
                  placeholder="Введіть імʼя"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Client phone */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Телефон</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={bookingClientPhone}
                  onChange={(e) => setBookingClientPhone(e.target.value)}
                  placeholder="+380"
                  className="pl-10"
                />
              </div>
            </div>

            {/* Date */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Дата</label>
              <Input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Час</label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Footer with action button */}
        {bookingStep === 'details' && (
          <div className="p-4 border-t border-border shrink-0">
            <button
              onClick={createBooking}
              disabled={savingBooking || !bookingClientName || !bookingClientPhone || !bookingTime}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {savingBooking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Створити запис
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
