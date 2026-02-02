'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Plus, Loader2, Clock, User, X, Check } from 'lucide-react';

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

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

const DAYS_UA = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

// Timeline booking card with arrows pointing left from card
function TimelineBookingCard({ booking, isPast, isToday: isTodayDate }: { booking: Booking; isPast: boolean; isToday: boolean }) {
  const isBlocked = booking.clientName === 'Зайнято';
  
  // Calculate end time
  const [h, m] = booking.time.split(':').map(Number);
  const endMins = h * 60 + m + booking.duration;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  const showEndTime = endM !== 0 && endM !== 30;
  
  return (
    <Card className={`relative overflow-visible ${
      booking.status === 'COMPLETED' 
        ? 'border-green-300 bg-green-50/30' 
        : isBlocked
        ? 'border-zinc-300 bg-zinc-50'
        : isPast 
        ? 'opacity-50' 
        : ''
    }`}>
      {/* Top arrow < pointing left from card */}
      <div 
        className={`absolute -left-[10px] top-3 w-0 h-0 
          border-t-[8px] border-t-transparent 
          border-b-[8px] border-b-transparent 
          ${isPast ? 'border-r-[10px] border-r-zinc-300' : 'border-r-[10px] border-r-primary'}`}
      />
      
      {/* Bottom arrow < pointing left from card */}
      <div 
        className="absolute -left-[8px] bottom-3 w-0 h-0 
          border-t-[6px] border-t-transparent 
          border-b-[6px] border-b-transparent 
          border-r-[8px] border-r-zinc-300"
      />
      
      {/* End time - inside card at bottom left */}
      {showEndTime && (
        <div className="absolute -left-[8px] bottom-[-18px] text-[10px] text-muted-foreground">
          {endTime}
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-sm">{booking.clientName}</p>
            <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
          </div>
          {booking.status === 'COMPLETED' && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">✓</span>
          )}
        </div>
        
        {!isBlocked && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{booking.duration} хв</span>
            {booking.price !== undefined && booking.price > 0 && (
              <span className="font-medium text-foreground">{booking.price} ₴</span>
            )}
          </div>
        )}
        
        {/* Actions */}
        {!isPast && booking.status !== 'COMPLETED' && (
          <div className="flex gap-1.5 mt-2">
            {!isBlocked && (
              <button className="flex-1 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors border border-green-200">
                Завершити
              </button>
            )}
            <button className="flex-1 py-1.5 rounded-lg bg-zinc-50 text-zinc-600 text-xs font-medium hover:bg-zinc-100 transition-colors border border-zinc-200">
              Редагувати
            </button>
            <button className="py-1.5 px-2 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50 transition-colors">
              ✕
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

// Booking card component
function BookingCard({ booking, isPast, isToday: isTodayDate }: { booking: Booking; isPast: boolean; isToday: boolean }) {
  const isBlocked = booking.clientName === 'Зайнято';
  
  // Calculate end time
  const [h, m] = booking.time.split(':').map(Number);
  const endMins = h * 60 + m + booking.duration;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  
  // Show end time only if it's not on :00 or :30
  const showEndTime = endM !== 0 && endM !== 30;
  
  return (
    <Card className={`mb-2 ${
      booking.status === 'COMPLETED' 
        ? 'border-green-300 bg-green-50/30' 
        : isBlocked
        ? 'border-zinc-300 bg-zinc-50'
        : isPast 
        ? 'opacity-50' 
        : ''
    }`}>
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-semibold text-sm">{booking.clientName}</p>
            <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
          </div>
          {showEndTime && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              до {endTime}
            </span>
          )}
          {booking.status === 'COMPLETED' && (
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full ml-2">
              ✓
            </span>
          )}
        </div>
        
        {!isBlocked && (
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <span>{booking.duration} хв</span>
            {booking.price !== undefined && booking.price > 0 && (
              <span className="font-medium text-foreground">{booking.price} ₴</span>
            )}
          </div>
        )}
        
        {/* Actions */}
        {!isPast && booking.status !== 'COMPLETED' && (
          <div className="flex gap-1.5 mt-2">
            {!isBlocked && (
              <button className="flex-1 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors border border-green-200">
                Завершити
              </button>
            )}
            <button className="flex-1 py-1.5 rounded-lg bg-zinc-50 text-zinc-600 text-xs font-medium hover:bg-zinc-100 transition-colors border border-zinc-200">
              Редагувати
            </button>
            <button className="py-1.5 px-2 rounded-lg text-red-500 text-xs font-medium hover:bg-red-50 transition-colors">
              ✕
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function StaffCalendar() {
  const router = useRouter();
  const daysRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [salonId, setSalonId] = useState('');
  const [workingHours, setWorkingHours] = useState<{ start: number; end: number }>({ start: 8, end: 21 });
  const [showOnlyBookings, setShowOnlyBookings] = useState(false);
  
  // Add booking modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newServiceId, setNewServiceId] = useState('');
  const [newTime, setNewTime] = useState('10:00');
  const [newDuration, setNewDuration] = useState('60');
  const [newPrice, setNewPrice] = useState('');
  const [creating, setCreating] = useState(false);
  
  // Pickers
  const [servicePickerOpen, setServicePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);
  
  // Time options will be generated based on working hours
  const getTimeOptions = () => {
    const slots = (workingHours.end - workingHours.start + 1) * 2;
    return Array.from({ length: slots }, (_, i) => {
      const hour = workingHours.start + Math.floor(i / 2);
      const min = i % 2 === 0 ? '00' : '30';
      return `${hour.toString().padStart(2, '0')}:${min}`;
    });
  };
  const timeOptions = getTimeOptions();
  
  const durationOptions = [
    { value: '15', label: '15 хв' },
    { value: '30', label: '30 хв' },
    { value: '45', label: '45 хв' },
    { value: '60', label: '1 год' },
    { value: '90', label: '1 год 30 хв' },
    { value: '120', label: '2 год' },
  ];

  // Generate 14 days from today
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    const salon = localStorage.getItem('staffSalonId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffId(id || '');
    setSalonId(salon || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (staffId && selectedDate) {
      loadBookings();
      loadWorkingHours();
    }
  }, [staffId, selectedDate]);

  useEffect(() => {
    if (staffId) {
      loadServices();
      loadWorkingHours();
    }
  }, [staffId]);

  const loadWorkingHours = async () => {
    // Default working hours
    const defaultHours = { start: 9, end: 21 };
    
    try {
      const res = await fetch(`/api/staff/profile?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.workingHours) {
          // Get day of week for selected date (0=Sun, 1=Mon, etc)
          const dayOfWeek = selectedDate.getDay();
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const daySchedule = data.workingHours[dayNames[dayOfWeek]];
          
          if (daySchedule && daySchedule.enabled && daySchedule.start && daySchedule.end) {
            const startHour = parseInt(daySchedule.start.split(':')[0]);
            const endHour = parseInt(daySchedule.end.split(':')[0]);
            setWorkingHours({ start: startHour, end: endHour });
            return;
          }
        }
      }
      // Fallback to default
      setWorkingHours(defaultHours);
    } catch (error) {
      console.error('Load working hours error:', error);
      setWorkingHours(defaultHours);
    }
  };

  const loadServices = async () => {
    try {
      const res = await fetch(`/api/staff/services?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Load services error:', error);
    }
  };

  const openAddModal = () => {
    setNewClientName('');
    setNewClientPhone('');
    setNewServiceId('');
    setNewTime('10:00');
    setNewDuration('60');
    setNewPrice('');
    setAddModalOpen(true);
  };

  const handleServiceSelect = (serviceId: string) => {
    setNewServiceId(serviceId);
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setNewDuration(service.duration.toString());
      setNewPrice(service.price.toString());
    }
    setServicePickerOpen(false);
  };

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
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
    setNewClientPhone(formatPhoneNumber(digits));
  };

  const createBooking = async () => {
    if (!newClientName || !newClientPhone || !newTime) return;
    
    setCreating(true);
    try {
      const selectedService = services.find(s => s.id === newServiceId);
      const dateStr = selectedDate.toISOString().split('T')[0];
      const fullPhone = '+380' + newClientPhone.replace(/\D/g, '');
      
      const res = await fetch('/api/staff/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
          salonId,
          serviceId: newServiceId || null,
          serviceName: selectedService?.name || 'Запис',
          clientName: newClientName,
          clientPhone: fullPhone,
          date: dateStr,
          time: newTime,
          duration: parseInt(newDuration) || 60,
          price: parseInt(newPrice) || 0
        })
      });
      
      if (res.ok) {
        setAddModalOpen(false);
        loadBookings();
      }
    } catch (error) {
      console.error('Create booking error:', error);
    } finally {
      setCreating(false);
    }
  };

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOnlyBookings(!showOnlyBookings)}
              className={`h-10 px-3 rounded-xl text-sm font-medium transition-colors ${
                showOnlyBookings 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {showOnlyBookings ? '✓ Записи' : 'Записи'}
            </button>
            <button 
              onClick={openAddModal}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Days horizontal scroll - sticky */}
      <div className="sticky top-[60px] z-10 bg-card border-b">
        <div 
          ref={daysRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
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
        
      </div>

      {/* Content - scrollable */}
      <div className="pb-24 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showOnlyBookings ? (
          /* Only bookings mode - compact with timeline */
          <div className="relative">
            {bookings.length > 0 ? (
              <>
                {/* Vertical timeline line */}
                <div className="absolute left-[52px] top-0 bottom-0 w-px bg-border" />
                
                <div className="py-4 space-y-6">
                  {bookings.map((booking) => {
                    const isPast = (() => {
                      if (!isToday(selectedDate)) return false;
                      const [h, m] = booking.time.split(':').map(Number);
                      const now = new Date();
                      return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                    })();
                    
                    return (
                      <div key={booking.id} className="flex items-start">
                        {/* Time label */}
                        <div className="w-12 shrink-0 pr-2 text-right">
                          <span className={`text-xs font-bold ${isPast ? 'text-muted-foreground' : 'text-primary'}`}>
                            {booking.time}
                          </span>
                        </div>
                        
                        {/* Dot */}
                        <div className="w-6 shrink-0 flex justify-center">
                          <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${isPast ? 'bg-muted-foreground' : 'bg-primary'}`} />
                        </div>
                        
                        {/* Card with arrows */}
                        <div className="flex-1 pr-4">
                          <TimelineBookingCard 
                            booking={booking} 
                            isPast={isPast} 
                            isToday={isToday(selectedDate)} 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Немає записів на цей день</p>
              </div>
            )}
          </div>
        ) : (
          /* Full day timeline - new concept */
          <div className="relative flex px-4">
            {/* Left: Time labels */}
            <div className="w-12 shrink-0 relative" style={{ height: `${(workingHours.end - workingHours.start + 1) * 120}px` }}>
              {Array.from({ length: workingHours.end - workingHours.start + 1 }, (_, i) => {
                const hour = workingHours.start + i;
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const isPastHour = isToday(selectedDate) && hour < new Date().getHours();
                
                return (
                  <div 
                    key={hour} 
                    className="absolute w-full text-right pr-3"
                    style={{ top: `${i * 120}px` }}
                  >
                    <span className={`text-xs font-medium ${isPastHour ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                      {timeStr}
                    </span>
                  </div>
                );
              })}
            </div>
            
            {/* Vertical line */}
            <div className="w-px bg-zinc-300 shrink-0" style={{ height: `${(workingHours.end - workingHours.start + 1) * 120}px` }} />
            
            {/* Right: Cards area */}
            <div className="flex-1 relative" style={{ minHeight: `${(workingHours.end - workingHours.start + 1) * 120}px` }}>
              {bookings.map((booking) => {
                const [startH, startM] = booking.time.split(':').map(Number);
                const startMinutes = (startH - workingHours.start) * 60 + startM;
                const topPosition = startMinutes * 2; // 2px per minute (120px per hour)
                const height = booking.duration * 2; // 2px per minute
                
                const isPast = isToday(selectedDate) && (startH < new Date().getHours() || (startH === new Date().getHours() && startM < new Date().getMinutes()));
                const isBlocked = booking.clientName === 'Зайнято';
                
                // Calculate end time
                const endMins = startH * 60 + startM + booking.duration;
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                
                return (
                  <div 
                    key={booking.id}
                    className={`absolute left-0 right-4 border border-l-0 rounded-r-xl overflow-hidden ${
                      booking.status === 'COMPLETED' 
                        ? 'border-green-300 bg-green-50' 
                        : isBlocked
                        ? 'border-zinc-300 bg-zinc-100'
                        : isPast 
                        ? 'border-zinc-200 bg-zinc-50 opacity-60' 
                        : 'border-orange-200 bg-orange-50'
                    }`}
                    style={{ 
                      top: `${topPosition}px`, 
                      height: `${Math.max(height, 80)}px`
                    }}
                  >
                    <div className="p-3 h-full flex flex-col">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-sm">{booking.clientName}</p>
                          <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
                        </div>
                        {booking.status === 'COMPLETED' && (
                          <span className="text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded-full">✓</span>
                        )}
                      </div>
                      
                      {!isBlocked && (
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{booking.duration} хв</span>
                          {booking.price !== undefined && booking.price > 0 && (
                            <span className="font-medium text-foreground">{booking.price} ₴</span>
                          )}
                        </div>
                      )}
                      
                      {!isPast && booking.status !== 'COMPLETED' && (
                        <div className="flex gap-1.5 mt-auto pt-2">
                          {!isBlocked && (
                            <button className="flex-1 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium">
                              Завершити
                            </button>
                          )}
                          <button className="flex-1 py-1.5 rounded-lg bg-white text-zinc-600 text-xs font-medium border border-zinc-200">
                            Редагувати
                          </button>
                          <button className="py-1.5 px-2 text-red-500 text-xs">✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Add Booking Modal */}
      {addModalOpen && (
        <div 
          className="fixed inset-0 bg-white/20 backdrop-blur-sm z-40"
          onClick={() => setAddModalOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 max-h-[85vh] bg-card rounded-t-3xl shadow-xl z-50 transform transition-transform duration-500 ease-out overflow-hidden flex flex-col ${
          addModalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-semibold">Новий запис</h2>
          <button 
            onClick={() => setAddModalOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Client Name */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Імя клієнта *</label>
            <Input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Наприклад: Олена"
            />
          </div>

          {/* Client Phone */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Телефон *</label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-sm font-medium text-muted-foreground">+380</span>
              <Input
                value={newClientPhone}
                onChange={handlePhoneChange}
                placeholder="XX XXX XX XX"
                className="pl-16"
                maxLength={12}
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Послуга</label>
            <button
              type="button"
              onClick={() => setServicePickerOpen(true)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
            >
              <span className={newServiceId ? '' : 'text-muted-foreground'}>
                {newServiceId 
                  ? services.find(s => s.id === newServiceId)?.name || 'Оберіть послугу'
                  : 'Оберіть послугу'}
              </span>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Time */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Час *</label>
            <button
              type="button"
              onClick={() => setTimePickerOpen(true)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
            >
              <span>{newTime}</span>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Duration */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Тривалість</label>
            <button
              type="button"
              onClick={() => setDurationPickerOpen(true)}
              className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
            >
              <span>{durationOptions.find(d => d.value === newDuration)?.label || '1 год'}</span>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Price */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ціна (₴)</label>
            <Input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              placeholder="500"
            />
          </div>
        </div>

        <div className="p-4 pb-8 border-t border-border shrink-0">
          <button
            onClick={createBooking}
            disabled={creating || !newClientName || !newClientPhone}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {creating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Check className="h-5 w-5" />
                Створити запис
              </>
            )}
          </button>
        </div>
      </div>

      {/* Service Picker */}
      {servicePickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setServicePickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          servicePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          <button
            onClick={() => {
              setNewServiceId('');
              setServicePickerOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
              !newServiceId ? 'text-white' : 'text-zinc-300'
            }`}
          >
            {!newServiceId && <Check className="h-5 w-5" />}
            <span className={!newServiceId ? '' : 'ml-8'}>Без послуги</span>
          </button>
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => handleServiceSelect(service.id)}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                newServiceId === service.id ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {newServiceId === service.id && <Check className="h-5 w-5" />}
              <span className={newServiceId === service.id ? '' : 'ml-8'}>
                {service.name} — {service.price}₴
              </span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setServicePickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Time Picker */}
      {timePickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setTimePickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          timePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => {
                setNewTime(time);
                setTimePickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                newTime === time ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {newTime === time && <Check className="h-5 w-5" />}
              <span className={newTime === time ? '' : 'ml-8'}>{time}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setTimePickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Duration Picker */}
      {durationPickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setDurationPickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          durationPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2">
          {durationOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setNewDuration(opt.value);
                setDurationPickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                newDuration === opt.value ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {newDuration === opt.value && <Check className="h-5 w-5" />}
              <span className={newDuration === opt.value ? '' : 'ml-8'}>{opt.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setDurationPickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </div>
  );
}
