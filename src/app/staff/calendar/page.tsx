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

export default function StaffCalendar() {
  const router = useRouter();
  const daysRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [salonId, setSalonId] = useState('');
  
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
  
  const timeOptions = Array.from({ length: 28 }, (_, i) => {
    const hour = 8 + Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${min}`;
  });
  
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
    }
  }, [staffId, selectedDate]);

  useEffect(() => {
    if (staffId) {
      loadServices();
    }
  }, [staffId]);

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

  const createBooking = async () => {
    if (!newClientName || !newClientPhone || !newTime) return;
    
    setCreating(true);
    try {
      const selectedService = services.find(s => s.id === newServiceId);
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const res = await fetch('/api/staff/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
          salonId,
          serviceId: newServiceId || null,
          serviceName: selectedService?.name || 'Запис',
          clientName: newClientName,
          clientPhone: newClientPhone,
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
          <button 
            onClick={openAddModal}
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
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Створити запис
            </button>
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
            <Input
              value={newClientPhone}
              onChange={(e) => setNewClientPhone(e.target.value)}
              placeholder="+380..."
            />
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
