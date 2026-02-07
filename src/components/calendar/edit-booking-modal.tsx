'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock, Calendar, Scissors, Plus, Minus, ChevronLeft, ChevronRight, Loader2, User, Lock, Search } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePreservedModal } from '@/hooks/use-preserved-modal';
import { TimeWheelPicker } from '@/components/time-wheel-picker';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    serviceId?: string;
    serviceName?: string;
    date: string;
    time: string;
    duration: number;
    extraTime?: number;
    masterId?: string;
  } | null;
  services: Service[];
  salonId: string;
  onSave: (data: {
    id: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    serviceId?: string;
    date: string;
    time: string;
    duration: number;
    extraTime: number;
  }) => Promise<void>;
}

export function EditBookingModal({ isOpen, onClose, booking, services, salonId, onSave }: EditBookingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [selectedClientPhone, setSelectedClientPhone] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [extraTime, setExtraTime] = useState<number>(0); // Додатковий час в хвилинах
  
  // Clients list
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);

  // Check if booking has started (can't change client/service after start)
  const hasStarted = booking ? (() => {
    const now = new Date();
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hour, min] = booking.time.split(':').map(Number);
    const bookingStart = new Date(year, month - 1, day, hour, min);
    return now >= bookingStart;
  })() : false;

  const resetState = useCallback(() => {
    setSelectedClientId('');
    setSelectedClientName('');
    setSelectedClientPhone('');
    setSelectedServiceId('');
    setSelectedDate(new Date());
    setSelectedTime('');
    setExtraTime(0);
    setClientSearch('');
    setShowClientPicker(false);
  }, []);

  usePreservedModal(isOpen, resetState);

  // Load clients
  useEffect(() => {
    if (isOpen && salonId) {
      fetch(`/api/clients?salonId=${salonId}`)
        .then(res => res.json())
        .then(data => setClients(Array.isArray(data) ? data : []))
        .catch(() => setClients([]));
    }
  }, [isOpen, salonId]);

  // Ініціалізація при відкритті
  useEffect(() => {
    if (isOpen && booking) {
      setSelectedClientId(booking.clientId || '');
      setSelectedClientName(booking.clientName || '');
      setSelectedClientPhone(booking.clientPhone || '');
      setSelectedServiceId(booking.serviceId || '');
      setSelectedDate(new Date(booking.date));
      setSelectedTime(booking.time);
      setExtraTime(booking.extraTime || 0);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible || !booking) return null;

  const selectedService = services.find(s => s.id === selectedServiceId);
  const baseDuration = selectedService?.duration || booking.duration;
  const totalDuration = baseDuration + extraTime;

  // Генерація 7 днів
  const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));

  // Генерація слотів часу (крок 15 хв)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 9; h < 21; h++) {
      for (let m = 0; m < 60; m += 15) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Обчислення часу закінчення
  const calculateEndTime = () => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    return `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    if (!selectedTime) return;
    
    setIsSaving(true);
    try {
      await onSave({
        id: booking.id,
        clientId: selectedClientId || undefined,
        clientName: selectedClientName || undefined,
        clientPhone: selectedClientPhone || undefined,
        serviceId: selectedServiceId || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        duration: totalDuration,
        extraTime,
      });
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Фільтровані клієнти
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  ).slice(0, 10);

  // Вибір клієнта
  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setSelectedClientName(client.name);
    setSelectedClientPhone(client.phone);
    setShowClientPicker(false);
    setClientSearch('');
  };

  // Чи є зміни
  const hasChanges = 
    selectedClientId !== (booking.clientId || '') ||
    selectedServiceId !== (booking.serviceId || '') ||
    !isSameDay(selectedDate, new Date(booking.date)) ||
    selectedTime !== booking.time ||
    extraTime !== (booking.extraTime || 0);

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
      
      {/* Full-screen bottom sheet */}
      <div 
        className="fixed inset-x-0 bottom-0 bg-background rounded-t-3xl shadow-xl z-[110] max-h-[92vh] overflow-hidden flex flex-col"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {/* Header */}
        <div className="px-4 pt-3 pb-3 border-b flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold">Редагувати запис</h2>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-muted transition-colors flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          {/* Попередження якщо запис вже почався */}
          {hasStarted && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                Запис вже почався — клієнта та послугу змінити неможливо
              </p>
            </div>
          )}

          {/* Клієнт */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              Клієнт
              {hasStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
            </label>
            {hasStarted ? (
              // Заблоковано після початку запису
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="font-medium">{selectedClientName || 'Невідомий клієнт'}</p>
                <p className="text-sm text-muted-foreground">{selectedClientPhone}</p>
              </div>
            ) : (
              // Можна змінити до початку
              <div className="relative">
                <button
                  onClick={() => setShowClientPicker(!showClientPicker)}
                  className={cn(
                    "w-full p-3 rounded-xl border text-left transition-all",
                    showClientPicker
                      ? 'border-primary ring-2 ring-primary/20'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <p className="font-medium">{selectedClientName || 'Оберіть клієнта'}</p>
                  {selectedClientPhone && (
                    <p className="text-sm text-muted-foreground">{selectedClientPhone}</p>
                  )}
                </button>
                
                {showClientPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-xl shadow-lg z-10 max-h-64 overflow-hidden">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Пошук клієнта..."
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/50 text-sm outline-none focus:ring-2 ring-primary/20"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <button
                            key={client.id}
                            onClick={() => handleSelectClient(client)}
                            className={cn(
                              "w-full p-3 text-left hover:bg-muted/50 transition-colors",
                              selectedClientId === client.id && 'bg-primary/5'
                            )}
                          >
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </button>
                        ))
                      ) : (
                        <p className="p-3 text-sm text-muted-foreground text-center">
                          {clientSearch ? 'Клієнтів не знайдено' : 'Немає клієнтів'}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Послуга */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              Послуга
              {hasStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
            </label>
            {hasStarted ? (
              // Заблоковано після початку запису
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="font-medium">{selectedService?.name || booking.serviceName || 'Невідома послуга'}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedService?.duration || booking.duration} хв · {selectedService?.price || '—'} ₴
                </p>
              </div>
            ) : (
              // Можна змінити до початку
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedServiceId(service.id)}
                    className={cn(
                      "p-2 rounded-xl border text-left transition-all text-sm",
                      selectedServiceId === service.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                  <p className="font-medium truncate">{service.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.duration} хв · {service.price} ₴
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Дата */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Дата
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const isSelected = isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "shrink-0 w-14 py-2 rounded-xl border text-center transition-all",
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="text-xs">{format(day, 'EEE', { locale: uk })}</p>
                    <p className="text-lg font-semibold">{format(day, 'd')}</p>
                    {isToday && !isSelected && (
                      <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Час - wheel picker */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Час
            </label>
            <div className="bg-zinc-900 rounded-2xl p-4">
              <TimeWheelPicker
                startTime={selectedTime || '10:00'}
                duration={totalDuration}
                onTimeChange={(start, end) => {
                  setSelectedTime(start);
                }}
                workingHours={{ start: 9, end: 20 }}
                isToday={isSameDay(selectedDate, new Date())}
              />
            </div>
          </div>

          {/* Додатковий час */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Plus className="h-4 w-4 text-muted-foreground" />
              Додатковий час
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setExtraTime(Math.max(0, extraTime - 5))}
                disabled={extraTime === 0}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 disabled:opacity-50 flex items-center justify-center"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-2xl font-semibold">{extraTime}</span>
                <span className="text-muted-foreground ml-1">хв</span>
              </div>
              <button
                onClick={() => setExtraTime(extraTime + 5)}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              Для клієнтів які люблять поговорити 😊
            </p>
          </div>

          {/* Швидкі кнопки +час */}
          <div className="flex gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                onClick={() => setExtraTime(extraTime + mins)}
                className="flex-1 py-2 rounded-xl bg-violet-100 text-violet-700 text-sm font-medium hover:bg-violet-200 transition-colors"
              >
                +{mins} хв
              </button>
            ))}
          </div>

          {/* Підсумок */}
          {selectedTime && (
            <div className="p-3 rounded-xl bg-muted/50">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Послуга:</span>
                <span className="font-medium">{selectedService?.name || booking.serviceName}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Час:</span>
                <span className="font-medium">{selectedTime} - {calculateEndTime()}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Тривалість:</span>
                <span className="font-medium">
                  {baseDuration} хв
                  {extraTime > 0 && <span className="text-violet-600"> +{extraTime} хв</span>}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t flex gap-2 shrink-0 pb-8">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
            Скасувати
          </Button>
          <Button 
            className="flex-1 h-11" 
            onClick={handleSave}
            disabled={!selectedTime || !hasChanges || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Зберегти
          </Button>
        </div>
      </div>
    </>
  );
}
