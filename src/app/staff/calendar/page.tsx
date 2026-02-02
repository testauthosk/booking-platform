'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Plus, Loader2, Clock, User, X, Check, Pencil, Phone } from 'lucide-react';

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

// Функція для генерації світлого фону та темної палочки з hex кольору
function getColorVariants(hex: string) {
  // Parse hex
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  // Light background (mix with white ~85%)
  const bgR = Math.round(r + (255 - r) * 0.85);
  const bgG = Math.round(g + (255 - g) * 0.85);
  const bgB = Math.round(b + (255 - b) * 0.85);
  
  // Dark stripe (darken by 35% like on main site)
  const darkR = Math.round(r * 0.65);
  const darkG = Math.round(g * 0.65);
  const darkB = Math.round(b * 0.65);
  
  return {
    bg: `rgb(${bgR}, ${bgG}, ${bgB})`,
    stripe: `rgb(${darkR}, ${darkG}, ${darkB})`
  };
}

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
  const [masterColor, setMasterColor] = useState('#87C2CA'); // default color
  
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
  
  // Edit booking modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTimePickerOpen, setEditTimePickerOpen] = useState(false);
  const [editDurationPickerOpen, setEditDurationPickerOpen] = useState(false);
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'cancel' | 'noshow' | null;
    booking: Booking | null;
  }>({ open: false, type: null, booking: null });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const handleConfirmAction = async () => {
    if (!confirmModal.booking || !confirmModal.type) return;
    
    setConfirmLoading(true);
    try {
      const status = confirmModal.type === 'cancel' ? 'CANCELLED' : 'NO_SHOW';
      const res = await fetch('/api/staff/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: confirmModal.booking.id, status })
      });
      if (res.ok) {
        setConfirmModal({ open: false, type: null, booking: null });
        loadBookings();
      } else {
        alert('Помилка при оновленні');
      }
    } catch (e) {
      alert('Помилка при оновленні');
    } finally {
      setConfirmLoading(false);
    }
  };
  
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
        // Load master color
        if (data.color) {
          setMasterColor(data.color);
        }
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
      } else {
        const data = await res.json();
        if (res.status === 409) {
          alert(data.error || 'На цей час вже є запис');
        } else {
          alert('Помилка при створенні запису');
        }
      }
    } catch (error) {
      console.error('Create booking error:', error);
      alert('Помилка при створенні запису');
    } finally {
      setCreating(false);
    }
  };

  // Open edit modal
  const openEditModal = (booking: Booking) => {
    setEditBooking(booking);
    setEditTime(booking.time);
    setEditDuration(booking.duration.toString());
    setEditModalOpen(true);
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
    <div className="h-[100dvh] flex flex-col bg-background overflow-x-hidden">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/staff')}
              className="h-10 w-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center transition-colors shadow-sm"
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
      <div className="shrink-0 bg-card border-b">
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
      <div className="flex-1 pb-4 overflow-y-auto">
        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : showOnlyBookings ? (
          /* Only bookings mode - simple cards without timeline */
          <div className="p-4 space-y-3">
            {bookings.length > 0 ? (
              bookings
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((booking) => {
                  const isPast = (() => {
                    if (!isToday(selectedDate)) return false;
                    const [h, m] = booking.time.split(':').map(Number);
                    const now = new Date();
                    return h < now.getHours() || (h === now.getHours() && m < now.getMinutes());
                  })();
                  
                  // Calculate end time
                  const [h, m] = booking.time.split(':').map(Number);
                  const endMins = h * 60 + m + booking.duration;
                  const endH = Math.floor(endMins / 60);
                  const endM = endMins % 60;
                  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                  
                  const colors = getColorVariants(masterColor);
                  const isBlocked = booking.clientName === 'Зайнято';
                  
                  return (
                    <div 
                      key={booking.id}
                      className={`rounded-xl overflow-hidden ${
                        booking.status === 'COMPLETED' 
                          ? 'bg-green-50' 
                          : isBlocked
                          ? 'bg-zinc-100'
                          : isPast 
                          ? 'opacity-60' 
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: booking.status === 'COMPLETED' ? undefined : isBlocked ? undefined : colors.bg,
                        borderLeft: `4px solid ${colors.stripe}`
                      }}
                    >
                      <div className="p-3 flex justify-between gap-3">
                        {/* Left: Info */}
                        <div className="flex-1 min-w-0">
                          {/* Time badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold">{booking.time}</span>
                            <span className="text-sm text-muted-foreground">—</span>
                            <span className="text-sm text-muted-foreground">{endTime}</span>
                          </div>
                          
                          <p className="font-semibold truncate">{booking.clientName}</p>
                          <p className="text-sm text-muted-foreground truncate">{booking.serviceName}</p>
                          
                          {!isBlocked && (
                            <div className="flex items-baseline gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">{booking.duration} хв</span>
                              {booking.price !== undefined && booking.price > 0 && (
                                <span className="text-base font-bold">{booking.price} ₴</span>
                              )}
                            </div>
                          )}
                          
                          {booking.status === 'COMPLETED' && (
                            <span className="inline-block mt-2 text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded">✓ Завершено</span>
                          )}
                          
                          {booking.status === 'NO_SHOW' && (
                            <span className="inline-block mt-2 text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded">Не прийшов</span>
                          )}
                        </div>
                        
                        {/* Right: Action buttons */}
                        {booking.status !== 'COMPLETED' && booking.status !== 'NO_SHOW' && !isBlocked && (
                          <div className="flex flex-col gap-1 shrink-0">
                            {/* Call button */}
                            <a 
                              href={`tel:${booking.clientPhone}`}
                              className="h-9 px-3 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Phone className="h-3.5 w-3.5" /> Зателефонувати
                            </a>
                            {/* Other buttons - only for non-past */}
                            {!isPast && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => openEditModal(booking)}
                                  className="flex-1 h-8 rounded-lg bg-white text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setConfirmModal({ open: true, type: 'noshow', booking })}
                                  className="flex-1 h-8 rounded-lg bg-white text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm" 
                                  title="Не прийшов"
                                >
                                  <Clock className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => setConfirmModal({ open: true, type: 'cancel', booking })}
                                  className="flex-1 h-8 rounded-lg bg-white text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
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
                  <div key={hour}>
                    {/* Hour label */}
                    <div 
                      className="absolute w-full text-right pr-2 -translate-y-1/2"
                      style={{ top: `${i * 120}px` }}
                    >
                      <span className={`text-xs font-medium ${isPastHour ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                        {timeStr}
                      </span>
                    </div>
                    {/* :30 label */}
                    <div 
                      className="absolute w-full text-right pr-2 -translate-y-1/2"
                      style={{ top: `${i * 120 + 60}px` }}
                    >
                      <span className="text-[10px] text-muted-foreground/40">30</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Vertical line with ticks */}
            <div className="relative shrink-0" style={{ height: `${(workingHours.end - workingHours.start + 1) * 120}px` }}>
              {/* Main line */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-zinc-300" />
              
              {/* Ticks */}
              {Array.from({ length: workingHours.end - workingHours.start + 1 }, (_, i) => (
                <div key={i}>
                  {/* Hour tick - longer */}
                  <div 
                    className="absolute left-0 w-2 h-px bg-zinc-400"
                    style={{ top: `${i * 120}px` }}
                  />
                  {/* :30 tick - shorter */}
                  <div 
                    className="absolute left-1 w-1 h-px bg-zinc-300"
                    style={{ top: `${i * 120 + 60}px` }}
                  />
                </div>
              ))}
              
              {/* Spacer for line area */}
              <div className="w-4" />
            </div>
            
            {/* Right: Cards area */}
            <div className="flex-1 relative" style={{ height: `${(workingHours.end - workingHours.start + 1) * 120}px` }}>
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
                
                // Get color variants from master color
                const colors = getColorVariants(masterColor);
                
                // Diagonal stripes pattern for past bookings
                const stripesPattern = isPast ? `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 5px,
                  rgba(0,0,0,0.07) 5px,
                  rgba(0,0,0,0.07) 10px
                )` : undefined;
                
                return (
                  <div 
                    key={booking.id}
                    className={`absolute -left-2 right-4 rounded-r-xl ${
                      booking.status === 'COMPLETED' 
                        ? 'bg-green-50' 
                        : isBlocked
                        ? 'bg-zinc-100'
                        : ''
                    }`}
                    style={{ 
                      top: `${topPosition}px`, 
                      height: `${height + 1}px`,
                      backgroundColor: booking.status === 'COMPLETED' ? undefined : isBlocked ? undefined : colors.bg,
                      backgroundImage: stripesPattern,
                      borderLeft: `4px solid ${colors.stripe}`,
                      borderTop: `1px solid ${colors.stripe}`,
                      borderRight: `1px solid ${colors.stripe}`,
                      borderBottom: `1px solid ${colors.stripe}`
                    }}
                  >
                    <div className="p-3 h-full flex justify-between gap-3">
                      {/* Left: Client info - aligned with buttons */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        {/* Top: Name + Service */}
                        <div>
                          <p className="font-bold text-lg truncate leading-9">{booking.clientName}</p>
                          <p className="text-base text-muted-foreground truncate">{booking.serviceName}</p>
                        </div>
                        
                        {/* Bottom: Duration + Price */}
                        {!isBlocked && (
                          <div className="flex items-center gap-3 h-8">
                            <span className="text-base text-muted-foreground">{booking.duration} хв</span>
                            {booking.price !== undefined && booking.price > 0 && (
                              <span className="text-lg font-bold">{booking.price} ₴</span>
                            )}
                          </div>
                        )}
                        
                        {booking.status === 'COMPLETED' && (
                          <span className="inline-block text-sm bg-green-200 text-green-700 px-2 py-1 rounded">✓ Завершено</span>
                        )}
                        
                        {booking.status === 'NO_SHOW' && (
                          <span className="inline-block text-sm bg-orange-200 text-orange-700 px-2 py-1 rounded">Не прийшов</span>
                        )}
                      </div>
                      
                      {/* Right: Action buttons */}
                      {booking.status !== 'COMPLETED' && booking.status !== 'NO_SHOW' && !isBlocked && (
                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Call button - always visible */}
                          <a 
                            href={`tel:${booking.clientPhone}`}
                            className="h-9 px-3 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                          >
                            <Phone className="h-3.5 w-3.5" /> Зателефонувати
                          </a>
                          {/* Other buttons - only for non-past */}
                          {!isPast && (
                            <div className="flex gap-1">
                              <button 
                                onClick={() => openEditModal(booking)}
                                className="flex-1 h-8 rounded-lg bg-white text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmModal({ open: true, type: 'noshow', booking })}
                                className="flex-1 h-8 rounded-lg bg-white text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm" 
                                title="Не прийшов"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => setConfirmModal({ open: true, type: 'cancel', booking })}
                                className="flex-1 h-8 rounded-lg bg-white text-red-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center border border-zinc-200 shadow-sm"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          )}
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

      {/* Edit Booking Modal */}
      {editModalOpen && editBooking && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setEditModalOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 max-h-[70vh] bg-card rounded-t-3xl shadow-xl z-50 transform transition-transform duration-500 ease-out overflow-hidden flex flex-col ${
          editModalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-semibold">Редагувати запис</h2>
          <button 
            onClick={() => setEditModalOpen(false)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {editBooking && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Client info (readonly) */}
            <div className="p-3 bg-muted rounded-xl">
              <p className="font-semibold">{editBooking.clientName}</p>
              <p className="text-sm text-muted-foreground">{editBooking.clientPhone}</p>
              <p className="text-sm text-muted-foreground">{editBooking.serviceName}</p>
            </div>

            {/* Time */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Час</label>
              <button
                type="button"
                onClick={() => setEditTimePickerOpen(true)}
                className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
              >
                <span>{editTime}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
              </button>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Тривалість</label>
              <button
                type="button"
                onClick={() => setEditDurationPickerOpen(true)}
                className="w-full h-11 px-4 rounded-xl border border-input bg-card text-sm text-left flex items-center justify-between"
              >
                <span>{durationOptions.find(d => d.value === editDuration)?.label || editDuration + ' хв'}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground rotate-[-90deg]" />
              </button>
            </div>
          </div>
        )}

        <div className="p-4 pb-8 border-t border-border shrink-0">
          <button
            onClick={async () => {
              if (!editBooking) return;
              try {
                const res = await fetch('/api/staff/bookings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    bookingId: editBooking.id, 
                    time: editTime, 
                    duration: parseInt(editDuration) 
                  })
                });
                if (res.ok) {
                  setEditModalOpen(false);
                  loadBookings();
                } else {
                  alert('Помилка при збереженні');
                }
              } catch (e) {
                alert('Помилка при збереженні');
              }
            }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Зберегти зміни
          </button>
        </div>
      </div>

      {/* Edit Time Picker */}
      {editTimePickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setEditTimePickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          editTimePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timeOptions.map((time) => (
            <button
              key={time}
              onClick={() => {
                setEditTime(time);
                setEditTimePickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                editTime === time ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {editTime === time && <Check className="h-5 w-5" />}
              <span className={editTime === time ? '' : 'ml-8'}>{time}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditTimePickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Edit Duration Picker */}
      {editDurationPickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setEditDurationPickerOpen(false)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          editDurationPickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2">
          {durationOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setEditDuration(opt.value);
                setEditDurationPickerOpen(false);
              }}
              className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                editDuration === opt.value ? 'text-white' : 'text-zinc-300'
              }`}
            >
              {editDuration === opt.value && <Check className="h-5 w-5" />}
              <span className={editDuration === opt.value ? '' : 'ml-8'}>{opt.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => setEditDurationPickerOpen(false)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
          onClick={() => !confirmLoading && setConfirmModal({ open: false, type: null, booking: null })}
        >
          <div 
            className="bg-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`pt-6 pb-4 flex justify-center ${
              confirmModal.type === 'cancel' ? 'bg-red-50' : 'bg-orange-50'
            }`}>
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                confirmModal.type === 'cancel' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {confirmModal.type === 'cancel' ? (
                  <X className="h-8 w-8 text-red-500" />
                ) : (
                  <Clock className="h-8 w-8 text-orange-500" />
                )}
              </div>
            </div>
            
            {/* Content */}
            <div className="p-5 text-center">
              <h3 className="text-lg font-bold mb-2">
                {confirmModal.type === 'cancel' ? 'Скасувати запис?' : 'Клієнт не прийшов?'}
              </h3>
              
              {confirmModal.booking && (
                <div className="text-sm text-muted-foreground space-y-0.5">
                  <p><span className="font-medium text-foreground">{confirmModal.booking.clientName}</span></p>
                  <p>{confirmModal.booking.serviceName}</p>
                  <p>{confirmModal.booking.time} · {confirmModal.booking.duration} хв</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-4 pt-0 flex gap-2">
              <button
                onClick={() => setConfirmModal({ open: false, type: null, booking: null })}
                disabled={confirmLoading}
                className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                Скасувати
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={confirmLoading}
                className={`flex-1 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                  confirmModal.type === 'cancel' 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {confirmLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  confirmModal.type === 'cancel' ? 'Так, скасувати' : 'Так, не прийшов'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// trigger 1770044868
