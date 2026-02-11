'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { staffFetch } from '@/lib/staff-fetch';
import { useSearchParams } from 'next/navigation';
import { useTransitionRouter } from 'next-view-transitions';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronLeft, Plus, Loader2, Clock, User, X, Check, Pencil, Phone, Minus } from 'lucide-react';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import { StaffBookingModal } from '@/components/staff/staff-booking-modal';
import { ClientCardPanel } from '@/components/staff/client-card-panel';
import { CalendarPickerModal } from '@/components/staff/calendar-picker-modal';

interface Booking {
  id: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  serviceId?: string;
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

function StaffCalendarContent() {
  const router = useTransitionRouter();
  const searchParams = useSearchParams();
  const daysRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [focusBookingId, setFocusBookingId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState('');
  const [staffName, setStaffName] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [timeBlocks, setTimeBlocks] = useState<Array<{ id: string; startTime: string; endTime: string; title: string; type: string }>>([]);
  const [salonId, setSalonId] = useState('');
  const [salonTimezone, setSalonTimezone] = useState('Europe/Kiev');
  const [workingHours, setWorkingHours] = useState<{ start: number; end: number }>({ start: 8, end: 21 });
  const [showOnlyBookings, setShowOnlyBookings] = useState(false);
  const [masterColor, setMasterColor] = useState('#87C2CA'); // default color
  
  // Add booking modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  
  // Edit booking modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editBaseDuration, setEditBaseDuration] = useState(60);
  const [editExtraTime, setEditExtraTime] = useState(0);
  const [editServiceId, setEditServiceId] = useState<string>('');
  
  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    type: 'cancel' | 'noshow' | null;
    booking: Booking | null;
  }>({ open: false, type: null, booking: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  // Calendar picker modal (full screen archive)
  const [calendarPickerOpen, setCalendarPickerOpen] = useState(false);
  
  // Client card panel
  const [clientCardOpen, setClientCardOpen] = useState(false);
  const [selectedClientForCard, setSelectedClientForCard] = useState<{ name: string; phone: string } | null>(null);

  // Close confirm modal with delay to keep content during animation
  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, open: false }));
    setTimeout(() => {
      setConfirmModal({ open: false, type: null, booking: null });
    }, 700);
  };

  const handleConfirmAction = async () => {
    if (!confirmModal.booking || !confirmModal.type) return;
    
    setConfirmLoading(true);
    try {
      const status = confirmModal.type === 'cancel' ? 'CANCELLED' : 'NO_SHOW';
      const res = await staffFetch('/api/staff/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: confirmModal.booking.id, status })
      });
      if (res.ok) {
        closeConfirmModal();
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

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const res = await staffFetch('/api/staff/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, status: 'COMPLETED' })
      });
      if (res.ok) {
        loadBookings();
      } else {
        alert('Помилка при завершенні');
      }
    } catch (e) {
      alert('Помилка при завершенні');
    }
  };

  // (calendar picker bookings are now handled inside CalendarPickerModal)
  
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

  // Хелпер: поточний час в timezone салону
  const getSalonNow = useCallback(() => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: salonTimezone,
      hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now);
    const h = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const m = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    return { hours: h, minutes: m, totalMinutes: h * 60 + m };
  }, [salonTimezone]);

  // Хелпер: сьогоднішня дата в timezone салону
  const getSalonToday = useCallback(() => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: salonTimezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date());
  }, [salonTimezone]);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    const name = localStorage.getItem('staffName');
    const salon = localStorage.getItem('staffSalonId');
    
    if (!token) {
      router.push('/staff/login');
      return;
    }
    
    setStaffId(id || '');
    setStaffName(name || '');
    setSalonId(salon || '');
    setLoading(false);
  }, [router]);

  // Load salon timezone
  useEffect(() => {
    if (!salonId) return;
    staffFetch('/api/staff/salon').then(res => {
      if (res.ok) return res.json();
    }).then(data => {
      if (data?.timezone) setSalonTimezone(data.timezone);
    }).catch(() => {});
  }, [salonId]);

  // Auto-complete past bookings once on mount
  useEffect(() => {
    if (staffId) {
      staffFetch('/api/staff/bookings/auto-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId: staffId })
      }).catch(() => {});
    }
  }, [staffId]);

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
      const res = await staffFetch(`/api/staff/profile?masterId=${staffId}`);
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
      const res = await staffFetch(`/api/staff/services?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Load services error:', error);
    }
  };

  const openAddModal = () => {
    setAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (booking: Booking) => {
    setEditBooking(booking);
    setEditTime(booking.time);
    setEditBaseDuration(booking.duration);
    setEditExtraTime(0);
    // Знайти serviceId за назвою
    const service = services.find(s => s.name === booking.serviceName);
    setEditServiceId(service?.id || '');
    setEditModalOpen(true);
  };

  // Sliding indicator positioning for day strip
  useEffect(() => {
    const updateIndicator = () => {
      const container = daysRef.current;
      if (!container) return;
      const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
      const indicator = container.querySelector('#timeline-day-indicator') as HTMLElement;
      if (!selected || !indicator) return;

      const containerRect = container.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      indicator.style.left = `${selectedRect.left - containerRect.left + container.scrollLeft}px`;
      indicator.style.top = `${selectedRect.top - containerRect.top}px`;
      indicator.style.width = `${selectedRect.width}px`;
      indicator.style.height = `${selectedRect.height}px`;
      indicator.style.opacity = '1';
    };

    // Scroll selected day into view then measure
    const container = daysRef.current;
    if (container) {
      const selected = container.querySelector('[data-day-selected="true"]') as HTMLElement;
      if (selected) {
        selected.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }

    // Use rAF to ensure layout is settled before measuring
    requestAnimationFrame(() => {
      requestAnimationFrame(updateIndicator);
    });
    // Fallback: re-measure after scroll animation completes (first render)
    const timer = setTimeout(updateIndicator, 350);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  // Handle focus on specific booking from URL params
  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    const time = searchParams.get('time');
    
    if (bookingId && time) {
      setFocusBookingId(bookingId);
      
      // Scroll to the booking time after a short delay
      setTimeout(() => {
        if (gridRef.current) {
          const [hours] = time.split(':').map(Number);
          const startHour = workingHours.start;
          const hourIndex = hours - startHour;
          const rowHeight = 60; // approximate height per hour
          const scrollTop = hourIndex * rowHeight;
          
          gridRef.current.scrollTo({
            top: Math.max(0, scrollTop - 100), // offset to center
            behavior: 'smooth'
          });
        }
        
        // Clear the focus after animation
        setTimeout(() => setFocusBookingId(null), 2000);
      }, 500);
      
      // Clean up URL
      router.replace('/staff/calendar', { scroll: false });
    }
  }, [searchParams, workingHours.start, router]);

  const loadBookings = async () => {
    setLoadingBookings(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const [bookingsRes, blocksRes] = await Promise.all([
        staffFetch(`/api/staff/bookings?masterId=${staffId}&date=${dateStr}`),
        staffFetch(`/api/staff/time-blocks?masterId=${staffId}&date=${dateStr}`),
      ]);
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      }
      if (blocksRes.ok) {
        const data = await blocksRes.json();
        setTimeBlocks(data);
      }
    } catch (error) {
      console.error('Load bookings error:', error);
    } finally {
      setLoadingBookings(false);
    }
  };

  const isToday = (date: Date) => {
    const salonTodayStr = getSalonToday(); // YYYY-MM-DD in salon timezone
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return dateStr === salonTodayStr;
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
    <>
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
            {/* Calendar picker button - styled like + button */}
            <button 
              onClick={() => setCalendarPickerOpen(true)}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowOnlyBookings(!showOnlyBookings)}
              className="h-10 w-[88px] rounded-xl text-sm font-medium border border-zinc-200 bg-white transition-colors duration-300 flex items-center justify-center gap-1 relative"
            >
              <span className={`transition-all duration-300 ease-out absolute left-2.5 ${showOnlyBookings ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>✓</span>
              <span className={`transition-transform duration-300 ease-out ${showOnlyBookings ? 'translate-x-2' : 'translate-x-0'}`}>Записи</span>
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

      {/* Days horizontal scroll - sticky with sliding indicator */}
      <div className="shrink-0 bg-card border-b">
        <div 
          ref={daysRef}
          className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide items-center relative"
        >
          {/* Sliding indicator */}
          <div
            id="timeline-day-indicator"
            className="absolute bg-primary rounded-xl shadow-lg z-0 pointer-events-none"
            style={{ transition: 'left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease', opacity: 0 }}
          />
          {days.map((date, index) => (
            <button
              key={index}
              data-day-selected={isSelected(date) ? 'true' : undefined}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center min-w-[56px] py-2 px-2 rounded-xl transition-colors duration-300 relative z-10 ${
                isSelected(date)
                  ? 'text-primary-foreground'
                  : isToday(date)
                  ? 'text-primary'
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

      {/* Content - scrollable with vertical carousel */}
      <div className="flex-1 overflow-hidden relative">
        {loadingBookings ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Bookings list view */}
            <div 
              className={`absolute inset-0 pb-4 overflow-y-auto bg-background transition-transform duration-700 ease-in-out ${
                showOnlyBookings ? 'translate-y-0 z-10' : '-translate-y-full z-0'
              }`}
            >
              <div className="p-4 space-y-3">
            {bookings.length > 0 ? (
              bookings
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((booking) => {
                  // Calculate end time
                  const [h, m] = booking.time.split(':').map(Number);
                  const endMins = h * 60 + m + booking.duration;
                  const endH = Math.floor(endMins / 60);
                  const endM = endMins % 60;
                  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                  
                  // Check if booking is ongoing or past (salon timezone)
                  const nowMins = getSalonNow().totalMinutes;
                  const startMins = h * 60 + m;
                  
                  const isOngoing = isToday(selectedDate) && nowMins >= startMins && nowMins < endMins && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED';
                  const isPast = isToday(selectedDate) && nowMins >= endMins && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED';
                  
                  const colors = getColorVariants(masterColor);
                  const isBlocked = booking.clientName === 'Зайнято';
                  
                  return (
                    <div 
                      key={booking.id}
                      className={`rounded-xl overflow-hidden ${
                        isBlocked
                          ? 'bg-zinc-100'
                          : isOngoing
                          ? 'ring-2 ring-blue-400 shadow-md'
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: isBlocked ? undefined : colors.bg,
                        borderLeft: `4px solid ${isOngoing ? '#3b82f6' : colors.stripe}`,
                        border: `1px solid ${colors.stripe}`,
                        borderLeftWidth: '4px',
                        backgroundImage: (booking.status === 'COMPLETED' || isPast) 
                          ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.04) 4px, rgba(0,0,0,0.04) 8px)'
                          : undefined,
                        opacity: isPast && booking.status !== 'COMPLETED' ? 0.6 : undefined,
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
                          
                          <button 
                            onClick={() => {
                              if (!isBlocked && booking.clientPhone) {
                                setSelectedClientForCard({ name: booking.clientName, phone: booking.clientPhone });
                                setClientCardOpen(true);
                              }
                            }}
                            className={`font-semibold truncate text-left ${!isBlocked ? 'hover:text-primary hover:underline' : ''}`}
                          >
                            {booking.clientName}
                          </button>
                          <p className="text-sm text-muted-foreground truncate">{booking.serviceName}</p>
                          
                          {!isBlocked && (
                            <div className="flex items-baseline gap-3 mt-1">
                              <span className="text-sm text-muted-foreground">{booking.duration} хв</span>
                              {booking.price !== undefined && booking.price > 0 && (
                                <span className="text-base font-bold">{booking.price} ₴</span>
                              )}
                            </div>
                          )}
                          
                          {isOngoing && (
                            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium animate-pulse">⏱ Зараз</span>
                          )}
                          
                          {booking.status === 'COMPLETED' && (
                            <span className="inline-block mt-2 text-xs bg-green-200 text-green-700 px-2 py-0.5 rounded">✓ Завершено</span>
                          )}
                          
                          {booking.status === 'NO_SHOW' && (
                            <span className="inline-block mt-2 text-xs bg-orange-200 text-orange-700 px-2 py-0.5 rounded">Не прийшов</span>
                          )}
                        </div>
                        
                        {/* Right: Action buttons */}
                        <div className="flex flex-col gap-1 shrink-0">
                          {/* Call button - always visible for real clients */}
                          {!isBlocked && booking.clientPhone && (
                            <a 
                              href={`tel:${booking.clientPhone}`}
                              className="h-9 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                            >
                              <Phone className="h-3.5 w-3.5" /> Зателефонувати
                            </a>
                          )}
                          {/* Other buttons - only for active bookings */}
                          {booking.status !== 'COMPLETED' && booking.status !== 'NO_SHOW' && !isBlocked && !isPast && (
                              <div className="flex flex-col gap-1">
                                {/* Complete button - prominent for ongoing */}
                                {isOngoing && (
                                  <button 
                                    onClick={() => handleCompleteBooking(booking.id)}
                                    className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1 border border-emerald-300"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Завершити
                                  </button>
                                )}
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
                              </div>
                            )}
                          </div>
                      </div>
                    </div>
                  );
                })
            ) : null}

            {/* Time blocks in list view */}
            {timeBlocks.map((block) => (
              <div
                key={`block-list-${block.id}`}
                className="rounded-xl overflow-hidden bg-zinc-100 border-l-4 border-zinc-400"
                style={{
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.03) 5px, rgba(0,0,0,0.03) 10px)',
                }}
              >
                <div className="p-3 flex justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-zinc-500">{block.startTime}</span>
                      <span className="text-sm text-zinc-400">—</span>
                      <span className="text-sm text-zinc-400">{block.endTime}</span>
                    </div>
                    <p className="font-semibold text-zinc-500">{block.title || 'Перерва'}</p>
                  </div>
                  <span className="text-lg">
                    {block.type === 'LUNCH' ? '🍽️' : block.type === 'DAY_OFF' ? '📅' : '⏸️'}
                  </span>
                </div>
              </div>
            ))}

            {bookings.length === 0 && timeBlocks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Немає записів на цей день</p>
              </div>
            )}
              </div>
            </div>
            
            {/* Timeline view */}
            <div 
              ref={gridRef}
              className={`absolute inset-0 pb-4 overflow-y-auto bg-background transition-transform duration-500 ease-out ${
                showOnlyBookings ? 'translate-y-full z-0' : 'translate-y-0 z-10'
              }`}
            >
              <div className="pt-4">
          <div className="relative flex pl-1 pr-4">
            {/* Left: Time labels */}
            <div className="w-10 shrink-0 relative" style={{ height: `${(workingHours.end - workingHours.start) * 120}px` }}>
              {Array.from({ length: workingHours.end - workingHours.start + 1 }, (_, i) => {
                const hour = workingHours.start + i;
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                const isPastHour = isToday(selectedDate) && hour < getSalonNow().hours;
                const isLastHour = hour === workingHours.end;
                
                return (
                  <div key={hour}>
                    {/* Hour label */}
                    <div 
                      className="absolute w-full text-right pr-2 -translate-y-1/2"
                      style={{ top: `${i * 120}px` }}
                    >
                      <span className={`text-xs font-medium ${isPastHour ? 'text-gray-400' : 'text-gray-900'}`}>
                        {timeStr}
                      </span>
                    </div>
                    {/* :30 label - only show if not last hour */}
                    {!isLastHour && (
                      <div 
                        className="absolute w-full text-right pr-2 -translate-y-1/2"
                        style={{ top: `${i * 120 + 60}px` }}
                      >
                        <span className="text-[10px] text-muted-foreground/40">30</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Vertical line with ticks */}
            <div className="relative shrink-0" style={{ height: `${(workingHours.end - workingHours.start) * 120}px` }}>
              {/* Main line */}
              <div className="absolute left-2 top-0 bottom-0 w-px bg-zinc-300" />
              
              {/* Ticks */}
              {Array.from({ length: workingHours.end - workingHours.start + 1 }, (_, i) => {
                const isLastHour = i === workingHours.end - workingHours.start;
                return (
                  <div key={i}>
                    {/* Hour tick - longer */}
                    <div 
                      className="absolute left-0 w-2 h-px bg-zinc-400"
                      style={{ top: `${i * 120}px` }}
                    />
                    {/* :30 tick - shorter, only if not last hour */}
                    {!isLastHour && (
                      <div 
                        className="absolute left-1 w-1 h-px bg-zinc-300"
                        style={{ top: `${i * 120 + 60}px` }}
                      />
                    )}
                  </div>
                );
              })}
              
              {/* Spacer for line area */}
              <div className="w-4" />
            </div>
            
            {/* Right: Cards area */}
            <div className="flex-1 relative" style={{ height: `${(workingHours.end - workingHours.start) * 120}px` }}>
              {/* Current time red line (salon timezone) */}
              {isToday(selectedDate) && (() => {
                const salonNow = getSalonNow();
                const currentHour = salonNow.hours;
                const currentMinute = salonNow.minutes;
                const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
                // Only show if current time is within working hours
                if (currentHour >= workingHours.start && currentHour <= workingHours.end) {
                  const currentMinutes = (currentHour - workingHours.start) * 60 + currentMinute;
                  const topPosition = currentMinutes * 2; // 2px per minute
                  return (
                    <div 
                      className="absolute right-0 flex items-center z-20 pointer-events-none -translate-y-1/2"
                      style={{ top: `${topPosition}px`, left: '-62px' }}
                    >
                      <span className="text-xs font-medium text-red-500 border border-red-500 rounded px-1 bg-white">{timeStr}</span>
                      <div className="flex-1 h-[2px] bg-red-500" />
                    </div>
                  );
                }
                return null;
              })()}
              
              {bookings.map((booking) => {
                const [startH, startM] = booking.time.split(':').map(Number);
                const startMinutes = (startH - workingHours.start) * 60 + startM;
                const topPosition = startMinutes * 2; // 2px per minute (120px per hour)
                const height = booking.duration * 2; // 2px per minute
                
                // Calculate current time in minutes (salon timezone)
                const nowMins = getSalonNow().totalMinutes;
                const bookingStartMins = startH * 60 + startM;
                const bookingEndMins = bookingStartMins + booking.duration;
                
                const isOngoing = isToday(selectedDate) && nowMins >= bookingStartMins && nowMins < bookingEndMins && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED';
                const isPast = isToday(selectedDate) && nowMins >= bookingEndMins && booking.status !== 'COMPLETED' && booking.status !== 'CANCELLED';
                const isBlocked = booking.clientName === 'Зайнято';
                
                // Calculate end time
                const endMins = startH * 60 + startM + booking.duration;
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                
                // Get color variants from master color
                const colors = getColorVariants(masterColor);
                
                // Diagonal stripes pattern for past or completed bookings
                const stripesPattern = (isPast || booking.status === 'COMPLETED') ? `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 5px,
                  rgba(0,0,0,0.07) 5px,
                  rgba(0,0,0,0.07) 10px
                )` : undefined;
                
                const isFocused = focusBookingId === booking.id;
                
                return (
                  <div 
                    key={booking.id}
                    className={`absolute -left-2 right-4 rounded-r-xl transition-all duration-300 ${
                      isBlocked
                        ? 'bg-zinc-100'
                        : isOngoing
                        ? 'shadow-lg z-10'
                        : ''
                    } ${isFocused ? 'ring-4 ring-primary ring-offset-2 scale-[1.02] z-20' : ''}`}
                    style={{ 
                      top: `${topPosition}px`, 
                      height: `${height + 1}px`,
                      backgroundColor: isBlocked ? undefined : colors.bg,
                      backgroundImage: stripesPattern,
                      borderLeft: `4px solid ${isOngoing ? '#3b82f6' : colors.stripe}`,
                      borderTop: `2px solid ${isOngoing ? '#3b82f6' : colors.stripe}`,
                      borderRight: `2px solid ${isOngoing ? '#3b82f6' : colors.stripe}`,
                      borderBottom: `2px solid ${isOngoing ? '#3b82f6' : colors.stripe}`
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
                        
                        {isOngoing && (
                          <span className="inline-block text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium animate-pulse">⏱ Зараз</span>
                        )}
                        
                        {booking.status === 'COMPLETED' && (
                          <span className="inline-block text-sm bg-green-200 text-green-700 px-2 py-1 rounded">✓ Завершено</span>
                        )}
                        
                        {booking.status === 'NO_SHOW' && (
                          <span className="inline-block text-sm bg-orange-200 text-orange-700 px-2 py-1 rounded">Не прийшов</span>
                        )}
                      </div>
                      
                      {/* Right: Action buttons */}
                      <div className="flex flex-col gap-1 shrink-0">
                        {/* Call button - always visible for real clients */}
                        {!isBlocked && booking.clientPhone && (
                          <a 
                            href={`tel:${booking.clientPhone}`}
                            className="h-9 px-3 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-1 shadow-sm whitespace-nowrap"
                          >
                            <Phone className="h-3.5 w-3.5" /> Зателефонувати
                          </a>
                        )}
                        {/* Complete button for ongoing */}
                        {isOngoing && (
                          <button 
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="h-9 px-3 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition-colors flex items-center justify-center gap-1 border border-emerald-300"
                          >
                            <Check className="h-3.5 w-3.5" /> Завершити
                          </button>
                        )}
                        {/* Other buttons - only for active non-past bookings */}
                        {booking.status !== 'COMPLETED' && booking.status !== 'NO_SHOW' && !isBlocked && !isPast && (
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
                    </div>
                  </div>
                );
              })}

              {/* Time blocks on timeline */}
              {timeBlocks.map((block) => {
                const [startH, startM] = block.startTime.split(':').map(Number);
                const [endH, endM] = block.endTime.split(':').map(Number);
                const startMinutes = (startH - workingHours.start) * 60 + startM;
                const blockDuration = (endH * 60 + endM) - (startH * 60 + startM);
                const topPosition = startMinutes * 2;
                const height = blockDuration * 2;

                return (
                  <div
                    key={`block-${block.id}`}
                    className="absolute -left-2 right-4 rounded-r-xl bg-zinc-100 border-l-4 border-zinc-400 border-t border-r border-b border-zinc-300"
                    style={{
                      top: `${topPosition}px`,
                      height: `${Math.max(height, 40)}px`,
                      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.04) 5px, rgba(0,0,0,0.04) 10px)',
                    }}
                  >
                    <div className="p-3 h-full flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-zinc-500">{block.title || 'Перерва'}</p>
                        <p className="text-xs text-zinc-400">{block.startTime} — {block.endTime}</p>
                      </div>
                      <span className="text-xs text-zinc-400">
                        {block.type === 'LUNCH' ? '🍽️' : block.type === 'DAY_OFF' ? '📅' : '⏸️'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* End of day message */}
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground/60">
              Кінець роботи. Час додому ❤️
            </p>
          </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Add Booking Modal */}
      {salonId && staffId && (
        <StaffBookingModal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          salonId={salonId}
          masterId={staffId}
          masterName={staffName}
          services={services}
          onSuccess={loadBookings}
        />
      )}

      {/* Edit Booking Modal */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-700 ease-in-out ${
          editModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setEditModalOpen(false)}
      />
      <div 
        className={`fixed inset-x-0 top-0 bottom-0 bg-card shadow-xl z-50 transform transition-all duration-500 ease-out overflow-hidden flex flex-col ${
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
            {/* Busy slots strip */}
            {bookings.filter(b => b.status !== 'CANCELLED' && b.id !== editBooking.id).length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Зайнято сьогодні:</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {bookings
                    .filter(b => b.status !== 'CANCELLED' && b.id !== editBooking.id)
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map((booking) => {
                      const [h, m] = booking.time.split(':').map(Number);
                      const endMins = h * 60 + m + booking.duration;
                      const endH = Math.floor(endMins / 60);
                      const endM = endMins % 60;
                      const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
                      return (
                        <div
                          key={booking.id}
                          className="shrink-0 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs"
                        >
                          <span className="font-semibold text-red-700">{booking.time}–{endTime}</span>
                          <span className="text-red-500 ml-1.5">{booking.clientName.split(' ')[0]}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            {/* Client info (readonly) */}
            <div className="p-3 bg-muted rounded-xl">
              <p className="font-semibold">{editBooking.clientName}</p>
              <p className="text-sm text-muted-foreground">{editBooking.clientPhone}</p>
            </div>

            {/* Service Selection */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Послуга
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {services.map((service) => {
                  const isSelected = editServiceId === service.id;
                  return (
                    <button
                      key={service.id}
                      onClick={() => {
                        setEditServiceId(service.id);
                        setEditBaseDuration(service.duration);
                      }}
                      className={`p-2 rounded-xl border text-left transition-all text-sm ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration} хв · {service.price} ₴
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Wheel Picker */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Час
              </label>
              <div className="bg-zinc-900 rounded-2xl p-4">
                <TimeWheelPicker
                  startTime={editTime || '10:00'}
                  duration={editBaseDuration + editExtraTime}
                  onTimeChange={(start) => setEditTime(start)}
                  workingHours={{ start: 9, end: 20 }}
                  isToday={false}
                />
              </div>
            </div>

            {/* Extra Time */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Plus className="h-4 w-4 text-muted-foreground" />
                Додатковий час
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditExtraTime(Math.max(0, editExtraTime - 5))}
                  disabled={editExtraTime === 0}
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-50 flex items-center justify-center"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-2xl font-semibold">{editExtraTime}</span>
                  <span className="text-muted-foreground ml-1">хв</span>
                </div>
                <button
                  onClick={() => setEditExtraTime(editExtraTime + 5)}
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick add buttons */}
            <div className="flex gap-2">
              {[5, 10, 15, 30].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setEditExtraTime(editExtraTime + mins)}
                  className="flex-1 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
                >
                  +{mins} хв
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Послуга:</span>
                <span className="font-medium">
                  {services.find(s => s.id === editServiceId)?.name || editBooking.serviceName}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Час:</span>
                <span className="font-medium">
                  {editTime} - {(() => {
                    if (!editTime) return '';
                    const [h, m] = editTime.split(':').map(Number);
                    const totalMin = h * 60 + m + editBaseDuration + editExtraTime;
                    return `${Math.floor(totalMin / 60).toString().padStart(2, '0')}:${(totalMin % 60).toString().padStart(2, '0')}`;
                  })()}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Тривалість:</span>
                <span className="font-medium">
                  {editBaseDuration} хв
                  {editExtraTime > 0 && <span className="text-violet-600"> +{editExtraTime} хв</span>}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 pb-8 border-t border-border shrink-0 flex gap-2">
          <button
            onClick={() => setEditModalOpen(false)}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 transition-colors"
          >
            Скасувати
          </button>
          <button
            onClick={async () => {
              if (!editBooking) return;
              const selectedService = services.find(s => s.id === editServiceId);
              try {
                const res = await staffFetch('/api/staff/bookings', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                    bookingId: editBooking.id, 
                    time: editTime, 
                    duration: editBaseDuration + editExtraTime,
                    serviceId: editServiceId || undefined,
                    serviceName: selectedService?.name || editBooking.serviceName,
                    price: selectedService?.price || editBooking.price
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
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="h-5 w-5" />
            Зберегти
          </button>
        </div>
      </div>

      {/* Confirmation Modal - Bottom Sheet */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] transition-all duration-700 ease-in-out ${
          confirmModal.open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => !confirmLoading && closeConfirmModal()}
      />
      <div 
        className={`fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-[90] transform transition-all duration-700 ease-in-out overflow-hidden ${
          confirmModal.open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Header with icon */}
        <div className={`p-4 pb-3 border-b flex items-center gap-3 ${
          confirmModal.type === 'cancel' ? 'border-red-100' : 'border-orange-100'
        }`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
            confirmModal.type === 'cancel' ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            {confirmModal.type === 'cancel' ? (
              <X className="h-5 w-5 text-red-500" />
            ) : (
              <Clock className="h-5 w-5 text-orange-500" />
            )}
          </div>
          <div>
            <h2 className="font-semibold">
              {confirmModal.type === 'cancel' ? 'Скасувати запис?' : 'Клієнт не прийшов?'}
            </h2>
            {confirmModal.booking && (
              <p className="text-sm text-muted-foreground">{confirmModal.booking.time} · {confirmModal.booking.serviceName}</p>
            )}
          </div>
          <button 
            onClick={() => !confirmLoading && closeConfirmModal()}
            className="ml-auto h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Booking info */}
        {confirmModal.booking && (
          <div className="p-4">
            <div className="p-3 bg-muted rounded-xl">
              <p className="font-semibold">{confirmModal.booking.clientName}</p>
              <p className="text-sm text-muted-foreground">{confirmModal.booking.serviceName}</p>
              <p className="text-sm text-muted-foreground">{confirmModal.booking.duration} хв {confirmModal.booking.price ? `· ${confirmModal.booking.price} ₴` : ''}</p>
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="p-4 pb-8 border-t border-border flex gap-2">
          <button
            onClick={() => closeConfirmModal()}
            disabled={confirmLoading}
            className="flex-1 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            Ні, назад
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
              <>
                {confirmModal.type === 'cancel' ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                {confirmModal.type === 'cancel' ? 'Скасувати' : 'Не прийшов'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Calendar Picker Modal */}
    <CalendarPickerModal
      isOpen={calendarPickerOpen}
      onClose={() => setCalendarPickerOpen(false)}
      onDateSelect={(d) => {
        setSelectedDate(d);
        setCalendarPickerOpen(false);
      }}
      staffId={staffId}
      salonId={salonId}
      masterColor={masterColor}
      onClientTap={(name, phone) => {
        setSelectedClientForCard({ name, phone });
        setClientCardOpen(true);
      }}
    />

    {/* Client Card Panel */}
    {selectedClientForCard && (
      <ClientCardPanel
        isOpen={clientCardOpen}
        onClose={() => {
          setClientCardOpen(false);
          setTimeout(() => setSelectedClientForCard(null), 350);
        }}
        clientPhone={selectedClientForCard.phone}
        clientName={selectedClientForCard.name}
        masterId={staffId}
        salonId={salonId}
        accentColor={masterColor}
      />
    )}
    </>
  );
}

interface StaffTimelineViewProps {
  selectedDate?: Date;
  onDateChange?: (d: Date) => void;
  reloadKey?: number;
}

export default function StaffTimelineView({ selectedDate: externalDate, onDateChange, reloadKey }: StaffTimelineViewProps = {}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
      <StaffCalendarContent />
    </Suspense>
  );
}
