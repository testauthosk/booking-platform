'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock, Calendar, Scissors, Plus, Minus, ChevronLeft, ChevronRight, Loader2, User, Lock, Search, Pencil, Check } from 'lucide-react';
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
    masterId?: string;
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
  const [masterServices, setMasterServices] = useState<Service[]>([]);
  const [masterName, setMasterName] = useState<string>('');
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [masters, setMasters] = useState<{ id: string; name: string }[]>([]);
  const [showMasterPicker, setShowMasterPicker] = useState(false);

  // Swipe down to close
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const deltaY = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedClientName, setSelectedClientName] = useState<string>('');
  const [selectedClientPhone, setSelectedClientPhone] = useState<string>('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
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
    setSelectedServiceIds([]);
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

  // Load masters list
  useEffect(() => {
    if (isOpen && salonId) {
      fetch(`/api/masters?salonId=${salonId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setMasters(data.map((m: any) => ({ id: m.id, name: m.name })));
            // Set initial master name
            if (booking?.masterId) {
              const master = data.find((m: any) => m.id === booking.masterId);
              setMasterName(master?.name || '');
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, salonId, booking?.masterId]);

  // Load services for selected master (reloads when master changes)
  useEffect(() => {
    const masterId = selectedMasterId || booking?.masterId;
    if (isOpen && masterId) {
      fetch(`/api/staff/services?masterId=${masterId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setMasterServices(data.map((s: any) => ({ id: s.id, name: s.name, duration: s.duration, price: s.price })));
          } else {
            setMasterServices([]);
          }
        })
        .catch(() => setMasterServices([]));
      // Update master name
      const master = masters.find(m => m.id === masterId);
      if (master) setMasterName(master.name);
    }
  }, [isOpen, selectedMasterId, booking?.masterId, masters]);

  // Ініціалізація при відкритті
  useEffect(() => {
    if (isOpen && booking) {
      setSelectedClientId(booking.clientId || '');
      setSelectedClientName(booking.clientName || '');
      setSelectedClientPhone(booking.clientPhone || '');
      setSelectedServiceIds(booking.serviceId ? [booking.serviceId] : []);
      setSelectedMasterId(booking.masterId || '');
      setSelectedDate(new Date(booking.date));
      setSelectedTime(booking.time);
      setExtraTime(booking.extraTime || 0);
      setShowMasterPicker(false);
    }
  }, [isOpen, booking]);

  // Анімація
  useEffect(() => {
    if (isOpen && booking) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, booking]);

  // Тільки свайп вниз — translate3d only
  useEffect(() => {
    const handle = handleRef.current;
    const sheet = sheetRef.current;
    if (!handle || !sheet) return;

    const applyFrame = () => {
      if (!isDragging.current) return;
      const d = Math.max(0, deltaY.current);
      sheet.style.transform = `translate3d(0,${d}px,0)`;
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      deltaY.current = 0;
      isDragging.current = true;
      sheet.style.transition = 'none';
      rafId.current = requestAnimationFrame(applyFrame);
    };

    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      deltaY.current = e.touches[0].clientY - touchStartY.current;
    };

    const onEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      cancelAnimationFrame(rafId.current);

      sheet.style.transition = 'transform 600ms cubic-bezier(0.2,0,0,1)';
      if (deltaY.current > 80) {
        sheet.style.transform = `translate3d(0,${window.innerHeight}px,0)`;
        setTimeout(() => onCloseRef.current(), 600);
      } else {
        sheet.style.transform = 'translate3d(0,0,0)';
      }
    };

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: true });
    handle.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
      cancelAnimationFrame(rafId.current);
    };
  }, [isVisible]);

  if (!isVisible || !booking) return null;

  const allServices = masterServices.length > 0 ? masterServices : services;
  const selectedServices = allServices.filter(s => selectedServiceIds.includes(s.id));
  const baseDuration = selectedServices.length > 0
    ? selectedServices.reduce((sum, s) => sum + s.duration, 0)
    : booking.duration;
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
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

  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    if (!selectedTime) return;
    
    setIsSaving(true);
    setSaveError('');
    try {
      await onSave({
        id: booking.id,
        clientId: selectedClientId || undefined,
        clientName: selectedClientName || undefined,
        clientPhone: selectedClientPhone || undefined,
        serviceId: selectedServiceIds.length > 0 ? selectedServiceIds[0] : undefined,
        masterId: selectedMasterId || booking.masterId || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        duration: totalDuration,
        extraTime,
      });
      onClose();
    } catch (error: any) {
      console.error('Save error:', error);
      setSaveError(error?.message || 'Помилка збереження');
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
    JSON.stringify(selectedServiceIds) !== JSON.stringify(booking.serviceId ? [booking.serviceId] : []) ||
    (selectedMasterId && selectedMasterId !== (booking.masterId || '')) ||
    !isSameDay(selectedDate, new Date(booking.date)) ||
    selectedTime !== booking.time ||
    extraTime !== (booking.extraTime || 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 z-[115]"
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: 'opacity 500ms ease-out',
        }}
        onClick={onClose}
      />

      {/* Fullscreen Sheet */}
      <div 
        ref={sheetRef}
        className="fixed inset-0 bg-background z-[120] flex flex-col"
        style={{
          transform: isAnimating ? 'translate3d(0,0,0)' : 'translate3d(0,100%,0)',
          transition: 'transform 600ms cubic-bezier(0.2, 0, 0, 1)',
          willChange: 'transform',
        }}
      >
        {/* Header — вся область для свайпу (native listeners via ref) */}
        <div
          ref={handleRef}
          className="px-4 pt-3 pb-3 border-b flex flex-col shrink-0"
          style={{ touchAction: 'none' }}
        >
          {/* Drag handle pill */}
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Редагувати запис</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/80 hover:bg-white shadow-md border border-gray-200 text-gray-700 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1" onScroll={() => showMasterPicker && setShowMasterPicker(false)}>
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

          {/* Послуга + вибір майстра */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                {masterName ? `Послуги ${masterName}` : 'Послуга'}
                {hasStarted && <Lock className="h-3 w-3 text-muted-foreground" />}
              </label>
              {!hasStarted && (
                <button
                  onClick={() => setShowMasterPicker(!showMasterPicker)}
                  className="flex items-center gap-1 text-xs text-primary font-medium px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Змінити майстра
                </button>
              )}
            </div>

            {/* Master picker — плавна анімація */}
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{ maxHeight: showMasterPicker ? '60px' : '0', opacity: showMasterPicker ? 1 : 0 }}
            >
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
                {masters.map((m) => {
                  const isActive = (selectedMasterId || booking?.masterId) === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedMasterId(m.id);
                        setSelectedServiceIds([]);
                      }}
                      className={cn(
                        "shrink-0 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-300 flex items-center gap-1.5",
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground shadow-md scale-105'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      {isActive && <Check className="h-3 w-3" />}
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>
            {hasStarted ? (
              // Заблоковано після початку запису
              <div className="p-3 rounded-xl bg-muted/50 border border-border">
                <p className="font-medium">{selectedServices[0]?.name || booking.serviceName || 'Невідома послуга'}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedServices[0]?.duration || booking.duration} хв · {selectedServices[0]?.price || '—'} ₴
                </p>
              </div>
            ) : (
              // Можна змінити до початку — послуги мастера з кастомними цінами
              <div className="relative rounded-xl border border-border p-2 bg-muted/20">
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {(masterServices.length > 0 ? masterServices : services).map((service) => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return (
                    <button
                      key={service.id}
                      onClick={() => setSelectedServiceIds(prev => 
                        prev.includes(service.id) 
                          ? prev.filter(id => id !== service.id)
                          : [...prev, service.id]
                      )}
                      className={cn(
                        "p-2.5 rounded-xl border text-left transition-all text-sm",
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <p className="font-medium truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {service.duration} хв · {service.price} ₴
                      </p>
                    </button>
                    );
                  })}
                </div>
                {/* Gradient hint — показує що можна скролити */}
                <div className="absolute bottom-0 left-2 right-2 h-8 bg-gradient-to-t from-muted/80 to-transparent pointer-events-none rounded-b-lg" />
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
                <span className="font-medium">{selectedServices.map(s => s.name).join(', ') || booking.serviceName}</span>
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
              {totalPrice > 0 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Вартість:</span>
                  <span className="font-semibold">{totalPrice} ₴</span>
                </div>
              )}
              {selectedServices.length > 1 && (
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Послуги:</span>
                  <span className="font-medium text-right text-xs">{selectedServices.map(s => s.name).join(', ')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error */}
        {saveError && (
          <div className="px-4 py-2 bg-red-50 text-red-600 text-sm">{saveError}</div>
        )}

        {/* Actions */}
        <div className="p-4 border-t flex gap-2 shrink-0 pb-8">
          <Button variant="outline" className="flex-1 h-11" onClick={onClose}>
            Скасувати
          </Button>
          <Button 
            className="flex-1 h-11" 
            onClick={handleSave}
            disabled={!selectedTime || isSaving}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Зберегти
          </Button>
        </div>
      </div>
    </>
  );
}
