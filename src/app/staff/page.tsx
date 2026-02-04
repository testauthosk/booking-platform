'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, LogOut, Settings, Loader2, Plus, ChevronRight, X, Tag, User, Phone, Check, Users } from 'lucide-react';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import { ColleagueBookingModal } from '@/components/staff/colleague-booking-modal';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';
import { getPaletteById } from '@/lib/color-palettes';

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
  const [staffAvatar, setStaffAvatar] = useState('');
  const [staffWorkingHours, setStaffWorkingHours] = useState({ start: 9, end: 20 });
  const [staffId, setStaffId] = useState('');
  const [salonId, setSalonId] = useState('');
  const [accentColor, setAccentColor] = useState('#000000'); // Колір з палітри салону
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
  const [bookingDate, setBookingDate] = useState(new Date());
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingEndTime, setBookingEndTime] = useState('11:00');
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingStep, setBookingStep] = useState<'service' | 'details'>('service');
  
  // Pickers
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  
  // Block time (вільний запис)
  const [blockTimeOpen, setBlockTimeOpen] = useState(false);
  const [colleagueBookingOpen, setColleagueBookingOpen] = useState(false);
  const [blockDate, setBlockDate] = useState(new Date());
  const [blockTimeStart, setBlockTimeStart] = useState('10:00');
  const [blockTimeEnd, setBlockTimeEnd] = useState('11:00');
  const [blockDatePickerOpen, setBlockDatePickerOpen] = useState(false);
  const [blockStartPickerOpen, setBlockStartPickerOpen] = useState(false);
  const [blockEndPickerOpen, setBlockEndPickerOpen] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  
  const timeOptions = Array.from({ length: 84 }, (_, i) => {
    const hour = 8 + Math.floor(i / 6);
    const min = (i % 6) * 10;
    return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  });
  
  const DAYS_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  
  // Generate 14 days from today
  const dateOptions = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

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
      loadProfile();
    }
  }, [staffId]);

  const loadProfile = async () => {
    try {
      const res = await fetch(`/api/staff/profile?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.avatar) setStaffAvatar(data.avatar);
        if (data.name) setStaffName(data.name);
        // Колір з палітри салону
        if (data.paletteId) {
          const palette = getPaletteById(data.paletteId);
          if (palette && palette.colors.length > 0) {
            setAccentColor(palette.colors[0].hex);
          }
        }
        // Parse working hours from profile
        if (data.workingHours && Array.isArray(data.workingHours) && data.workingHours.length > 0) {
          // workingHours is array like [{day: 0, start: "09:00", end: "18:00"}, ...]
          // Get today's working hours or default
          const today = new Date().getDay();
          const todayHours = data.workingHours.find((wh: { day: number }) => wh.day === today);
          if (todayHours && todayHours.start && todayHours.end) {
            const startHour = parseInt(todayHours.start.split(':')[0]);
            const endHour = parseInt(todayHours.end.split(':')[0]);
            setStaffWorkingHours({ start: startHour, end: endHour });
          }
        }
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

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
    setBookingDate(new Date());
    setBookingTime('10:00');
    setNewBookingOpen(true);
  };
  
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) return 'Сьогодні';
    if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
    return `${date.getDate()} ${MONTHS_UA[date.getMonth()]}`;
  };
  
  const openBlockTime = () => {
    setBlockDate(new Date());
    setBlockTimeStart('10:00');
    setBlockTimeEnd('11:00');
    setBlockTimeOpen(true);
  };
  
  const createBlockTime = async () => {
    setSavingBlock(true);
    try {
      const dateStr = blockDate.toISOString().split('T')[0];
      
      // Calculate duration
      const [startH, startM] = blockTimeStart.split(':').map(Number);
      const [endH, endM] = blockTimeEnd.split(':').map(Number);
      const duration = (endH * 60 + endM) - (startH * 60 + startM);
      
      const res = await fetch('/api/staff/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
          salonId,
          clientName: 'Зайнято',
          clientPhone: '-',
          serviceName: 'Вільний запис',
          date: dateStr,
          time: blockTimeStart,
          duration: duration,
          price: 0
        })
      });
      
      if (res.ok) {
        setBlockTimeOpen(false);
        loadStats();
      }
    } catch (error) {
      console.error('Create block error:', error);
    } finally {
      setSavingBlock(false);
    }
  };
  
  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format: XX XXX XX XX (9 digits after +380)
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 2);
    if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
    if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
    if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
    
    return formatted;
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setBookingClientPhone(formatPhoneNumber(digits));
  };

  const createBooking = async () => {
    if (!bookingService || !bookingClientName || !bookingClientPhone || !bookingDate || !bookingTime) return;
    
    setSavingBooking(true);
    try {
      // Format full phone number
      const fullPhone = '+380' + bookingClientPhone.replace(/\D/g, '');
      const dateStr = bookingDate.toISOString().split('T')[0];
      
      const bookingData = {
          salonId,
          masterId: staffId,
          serviceId: bookingService.id,
          clientName: bookingClientName,
          clientPhone: fullPhone,
          serviceName: bookingService.name,
          masterName: staffName,
          date: dateStr,
          time: bookingTime,
          timeEnd: bookingEndTime,
          duration: bookingService.duration,
          price: bookingService.price
        };
      
      console.log('[STAFF] Creating booking:', bookingData);
      
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });
      
      if (res.ok) {
        setNewBookingOpen(false);
        setBookingStep('service');
        setBookingService(null);
        setBookingClientName('');
        setBookingClientPhone('');
        loadStats(); // Refresh stats
      } else {
        const error = await res.json();
        console.error('[STAFF] Booking error:', error);
        alert(error.error || 'Помилка створення запису');
      }
    } catch (error) {
      console.error('Create booking error:', error);
      alert('Помилка з\'єднання');
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
            {staffAvatar ? (
              <img 
                src={staffAvatar} 
                alt={staffName} 
                className="h-12 w-12 rounded-2xl object-cover shadow-lg"
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {staffName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold text-lg">{staffName}</p>
              <p className="text-sm text-muted-foreground">Особистий кабінет</p>
            </div>
          </div>
          <button 
            onClick={() => setSettingsOpen(true)}
            className="h-9 w-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted transition-colors active:scale-[0.98]"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4 pb-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold">{greeting}!</h1>
          <p className="text-muted-foreground">
            {stats?.todayCount 
              ? `У вас ${stats.todayCount} ${stats.todayCount === 1 ? 'запис' : stats.todayCount < 5 ? 'записи' : 'записів'} сьогодні`
              : 'Сьогодні вільний день'}
          </p>
        </div>

        {/* Next booking - compact */}
        {stats?.nextBooking && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-orange-50 border border-orange-100">
            <div className="h-9 w-14 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
              {stats.nextBooking.time}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{stats.nextBooking.clientName} · {stats.nextBooking.serviceName}</p>
            </div>
            {getTimeUntil(stats.nextBooking.time) && (
              <span className="text-xs text-orange-600 shrink-0">{getTimeUntil(stats.nextBooking.time)}</span>
            )}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 pt-4 text-center flex flex-col justify-center">
            <p className="text-4xl font-bold text-primary">
              {loadingStats ? '...' : stats?.todayCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Сьогодні</p>
          </Card>
          <Card className="p-3 pt-4 text-center flex flex-col justify-center">
            <p className="text-4xl font-bold">
              {loadingStats ? '...' : stats?.tomorrowCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">Завтра</p>
          </Card>
          <Card className="p-3 pt-4 text-center flex flex-col justify-center">
            <p className="text-4xl font-bold">
              {loadingStats ? '...' : stats?.weekCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-2">За тиждень</p>
          </Card>
        </div>

        {/* Quick actions - horizontal layout */}
        <div className="grid grid-cols-2 gap-3">
          <Card 
            className="p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => router.push('/staff/calendar')}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl border border-border flex flex-col items-center justify-center shrink-0">
                <span className="text-lg font-bold leading-none">{new Date().getDate()}</span>
                <span className="text-[8px] font-medium uppercase text-muted-foreground">
                  {new Date().toLocaleDateString('uk-UA', { month: 'short' }).replace('.', '')}
                </span>
              </div>
              <div>
                <p className="font-medium text-sm">Календар</p>
                <p className="text-xs text-muted-foreground">Розклад</p>
              </div>
            </div>
          </Card>

          <Card 
            className="p-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
            onClick={() => router.push('/staff/services')}
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl border border-border flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Послуги</p>
                <p className="text-xs text-muted-foreground">Ціни</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Today's appointments - horizontal timeline */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Записи на сьогодні</h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={openBlockTime}
                className="h-9 px-3 rounded-xl border border-border text-sm font-medium flex items-center gap-1.5 hover:bg-muted transition-colors active:scale-[0.98]"
              >
                <Clock className="h-4 w-4" />
                Вільний
              </button>
              <button 
                onClick={() => openNewBooking()}
                className="h-9 w-10 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                <Plus className="h-5 w-5 stroke-[3]" />
              </button>
            </div>
          </div>

          {loadingStats ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats?.todayBookings && stats.todayBookings.length > 0 ? (
            <div className="overflow-x-auto -mx-4 scrollbar-hide">
              <div className="flex gap-3 pb-2 px-4">
                {stats.todayBookings.map((booking) => {
                  const isPast = (() => {
                    const [h, m] = booking.time.split(':').map(Number);
                    const now = new Date();
                    return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                  })();
                  
                  return (
                    <Card 
                      key={booking.id}
                      className={`p-3 w-[160px] shrink-0 transition-all ${isPast ? 'opacity-50' : ''} ${
                        booking.status === 'COMPLETED' ? 'border-green-300 bg-green-50' : ''
                      }`}
                    >
                      {/* Time badge */}
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-bold mb-2 ${
                        isPast ? 'bg-muted text-muted-foreground' : 
                        booking.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                        'bg-zinc-100 text-zinc-900'
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
                
                {/* Add button - same style as booking card */}
                <Card 
                  className="p-3 w-[160px] shrink-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors border-dashed border-2"
                  onClick={() => openNewBooking()}
                >
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-muted-foreground">Додати</span>
                </Card>
                
                {/* Spacer for scroll padding */}
                <div className="w-4 shrink-0" aria-hidden="true" />
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
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-700 ease-in-out ${
          settingsOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSettingsOpen(false)}
      />
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-card border-l border-border shadow-xl z-50 transform transition-transform duration-[560ms] ease-out will-change-transform ${
          settingsOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Налаштування</h2>
            <button 
              onClick={() => setSettingsOpen(false)}
              className="h-9 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 p-4 space-y-1">
            <button 
              onClick={() => { setSettingsOpen(false); router.push('/staff/profile'); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors text-left"
            >
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Settings className="h-5 w-5" style={{ color: accentColor }} />
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
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${accentColor}15` }}
              >
                <Clock className="h-5 w-5" style={{ color: accentColor }} />
              </div>
              <div>
                <p className="font-medium">Графік роботи</p>
                <p className="text-xs text-muted-foreground">Робочі години</p>
              </div>
            </button>
          </div>

          {/* Action buttons */}
          <div className="px-4 pt-2 space-y-2">
            {/* My clients button */}
            <button 
              onClick={() => router.push('/staff/clients')}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
              style={{ 
                backgroundColor: `${accentColor}08`,
                borderWidth: 1,
                borderColor: `${accentColor}30`,
              }}
            >
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <User className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Мої клієнти</p>
                <p className="text-xs text-muted-foreground">Клієнти що були у вас</p>
              </div>
              <ChevronRight className="h-5 w-5" style={{ color: `${accentColor}80` }} />
            </button>

            {/* Colleague booking button */}
            <button 
              onClick={() => setColleagueBookingOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors text-left"
              style={{ 
                backgroundColor: `${accentColor}08`,
                borderWidth: 1,
                borderColor: `${accentColor}30`,
              }}
            >
              <div 
                className="h-10 w-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: accentColor }}
              >
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium">Запис для колеги</p>
                <p className="text-xs text-muted-foreground">Створити запис напарнику</p>
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
      {/* Block Time Modal */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-700 ease-in-out ${
          blockTimeOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setBlockTimeOpen(false)}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-50 transform transition-all duration-700 ease-in-out overflow-hidden ${
          blockTimeOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold">Вільний запис</h2>
          <button 
            onClick={() => setBlockTimeOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Заблокуйте час у графіку</p>
          
          {/* Date */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Дата</label>
            <button
              type="button"
              onClick={() => setBlockDatePickerOpen(true)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
            >
              <span>{formatDateDisplay(blockDate)}</span>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Початок</label>
              <button
                type="button"
                onClick={() => setBlockStartPickerOpen(true)}
                className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
              >
                <span>{blockTimeStart}</span>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Кінець</label>
              <button
                type="button"
                onClick={() => setBlockEndPickerOpen(true)}
                className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
              >
                <span>{blockTimeEnd}</span>
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={createBlockTime}
            disabled={savingBlock}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {savingBlock ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Заблокувати
              </>
            )}
          </button>
        </div>
      </div>

      {/* Block Date Picker */}
      {blockDatePickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setBlockDatePickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          blockDatePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {dateOptions.map((date, index) => {
            const isSelected = date.toDateString() === blockDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <button
                key={index}
                onClick={() => {
                  setBlockDate(date);
                  setBlockDatePickerOpen(false);
                }}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                  isSelected ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {isSelected && <Check className="h-5 w-5" />}
                <span className={isSelected ? '' : 'ml-8'}>
                  {DAYS_UA[date.getDay()]}, {date.getDate()} {MONTHS_UA[date.getMonth()]}
                  {isToday && <span className="ml-2 text-zinc-400">(сьогодні)</span>}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setBlockDatePickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Block Start Time Picker */}
      {blockStartPickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setBlockStartPickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          blockStartPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => {
                setBlockTimeStart(time);
                setBlockStartPickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                blockTimeStart === time ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {blockTimeStart === time && <Check className="h-5 w-5" />}
              <span className={blockTimeStart === time ? '' : 'ml-8'}>{time}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setBlockStartPickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Block End Time Picker */}
      {blockEndPickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setBlockEndPickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          blockEndPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => {
                setBlockTimeEnd(time);
                setBlockEndPickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                blockTimeEnd === time ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {blockTimeEnd === time && <Check className="h-5 w-5" />}
              <span className={blockTimeEnd === time ? '' : 'ml-8'}>{time}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setBlockEndPickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Colleague Booking Modal — завжди рендерити для збереження стану */}
      {salonId && staffId && (
        <ColleagueBookingModal
          isOpen={colleagueBookingOpen}
          onClose={() => setColleagueBookingOpen(false)}
          salonId={salonId}
          currentMasterId={staffId}
          onSuccess={() => {
            loadStats();
          }}
        />
      )}

      {/* Staff Booking Modal — для власних записів */}
      {salonId && staffId && (
        <StaffBookingModal
          isOpen={newBookingOpen}
          onClose={() => setNewBookingOpen(false)}
          salonId={salonId}
          masterId={staffId}
          masterName={staffName}
          services={services}
          onSuccess={() => {
            loadStats();
          }}
        />
      )}
    </div>
  );
}
