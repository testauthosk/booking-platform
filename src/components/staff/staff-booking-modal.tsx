'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, Clock, User, Phone,
  Search, Plus, Calendar, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
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
  lastName?: string;
  phone: string;
}

interface StaffBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonId: string;
  masterId: string;
  masterName: string;
  services: Service[];
  onSuccess?: () => void;
}

type Step = 'service' | 'client' | 'datetime' | 'confirm';

const STEPS: { id: Step; label: string }[] = [
  { id: 'service', label: 'Послуга' },
  { id: 'client', label: 'Клієнт' },
  { id: 'datetime', label: 'Час' },
  { id: 'confirm', label: 'Готово' },
];

export function StaffBookingModal({
  isOpen,
  onClose,
  salonId,
  masterId,
  masterName,
  services,
  onSuccess,
}: StaffBookingModalProps) {
  const [step, setStep] = useState<Step>('service');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Анімація відкриття/закриття
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [extraTime, setExtraTime] = useState(0); // Додатковий час в хвилинах
  
  // Client
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientLastName, setNewClientLastName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [loadingClients, setLoadingClients] = useState(false);
  
  // DateTime
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [masterBookings, setMasterBookings] = useState<any[]>([]);
  
  // State
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('service');
    setSelectedService(null);
    setExtraTime(0);
    setSelectedClient(null);
    setIsNewClient(false);
    setNewClientName('');
    setNewClientLastName('');
    setNewClientPhone('');
    setClientSearch('');
    setSelectedDate(new Date());
    setSelectedTime('');
    setError(null);
    setShowCancelConfirm(false);
  }, []);

  // Перевірка чи є введені дані
  const hasData = selectedService || selectedClient || newClientName || newClientPhone || selectedTime;

  // Обробка закриття з підтвердженням
  const handleClose = useCallback(() => {
    if (step === 'confirm') {
      onClose();
    } else if (hasData) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  }, [hasData, step, onClose]);

  // Підтвердити скасування
  const confirmCancel = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Анімація відкриття/закриття
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      // Невелика затримка для запуску анімації
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      // Чекаємо завершення анімації перед приховуванням (700ms для закриття)
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  usePreservedModal(isOpen, resetState);

  // Завантажити клієнтів салону при відкритті
  useEffect(() => {
    if (isOpen && clients.length === 0) {
      loadClients();
    }
  }, [isOpen]);

  // Завантажити записи мастера на дату
  useEffect(() => {
    if (step === 'datetime' && masterId) {
      loadMasterBookings();
    }
  }, [step, masterId, selectedDate]);

  const loadClients = async (search?: string) => {
    setLoadingClients(true);
    try {
      const params = new URLSearchParams({ salonId });
      if (search) params.append('search', search);
      const res = await fetch(`/api/staff/clients/all?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadMasterBookings = async () => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/staff/bookings?masterId=${masterId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setMasterBookings(data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  // Фільтр клієнтів
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    (c.lastName && c.lastName.toLowerCase().includes(clientSearch.toLowerCase())) ||
    c.phone.includes(clientSearch)
  );

  // Загальна тривалість (послуга + додатковий час)
  const getTotalDuration = () => {
    return (selectedService?.duration || 60) + extraTime;
  };

  // Час закінчення
  const getEndTime = () => {
    if (!selectedTime) return '';
    const [h, m] = selectedTime.split(':').map(Number);
    const endMinutes = h * 60 + m + getTotalDuration();
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  // Генерація слотів часу (крок 15 хв)
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) continue;
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  };

  // Перевірка чи слот зайнятий
  const isSlotBooked = (time: string) => {
    const duration = getTotalDuration();
    const [h, m] = time.split(':').map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + duration;

    return masterBookings.some(booking => {
      if (booking.status === 'CANCELLED') return false;
      const [bh, bm] = booking.time.split(':').map(Number);
      const bookingStart = bh * 60 + bm;
      const bookingEnd = bookingStart + (booking.duration || 60);
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  // Перевірка чи час минув
  const isTimePast = (time: string) => {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    if (selectedDate.toDateString() === now.toDateString()) {
      return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
    }
    return false;
  };

  // Генерація 14 днів
  const generateDays = () => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

  // Форматування телефону
  const formatPhoneDisplay = (digits: string) => {
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 9);
    setNewClientPhone(formatPhoneDisplay(digits));
  };

  // Збереження
  const handleSave = async () => {
    if (!selectedService || !selectedTime) return;
    if (!selectedClient && !isNewClient) return;
    if (isNewClient && (!newClientName || !newClientPhone)) return;

    setIsSaving(true);
    setError(null);

    try {
      // Якщо новий клієнт — створюємо
      let clientId = selectedClient?.id;
      // Combine name + lastName if provided
      const fullName = newClientLastName 
        ? `${newClientName} ${newClientLastName}`.trim()
        : newClientName;
      let clientName = selectedClient?.name || fullName;
      let clientPhone = selectedClient?.phone || ('+380' + newClientPhone.replace(/\D/g, ''));

      if (isNewClient) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: fullName, 
            phone: clientPhone,
            salonId 
          }),
        });
        if (clientRes.ok) {
          const newClient = await clientRes.json();
          clientId = newClient.id;
        }
      }

      // Створюємо запис
      const dateStr = selectedDate.toISOString().split('T')[0];
      const endTime = getEndTime();

      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId,
          clientId,
          serviceId: selectedService.id,
          clientName,
          clientPhone,
          serviceName: selectedService.name,
          masterName,
          date: dateStr,
          time: selectedTime,
          timeEnd: endTime,
          duration: getTotalDuration(),
          price: selectedService.price,
          extraTime: extraTime > 0 ? extraTime : undefined,
          status: 'CONFIRMED',
        }),
      });

      if (res.ok) {
        setStep('confirm');
        onSuccess?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Помилка створення запису');
      }
    } catch (err: any) {
      setError(err.message || 'Помилка з\'єднання');
    } finally {
      setIsSaving(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  const canProceed = () => {
    switch (step) {
      case 'service': return !!selectedService;
      case 'client': return !!selectedClient || (isNewClient && newClientName && newClientPhone);
      case 'datetime': return !!selectedTime;
      default: return false;
    }
  };

  // Вимірюємо висоту контенту після кожного рендеру
  useLayoutEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
    }
  }, [step, selectedService, selectedClient, isNewClient, clients, extraTime, newClientName, newClientPhone, clientSearch, selectedDate, selectedTime]);

  const nextStep = () => {
    const idx = currentStepIndex;
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1].id);
    }
  };

  const prevStep = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(STEPS[idx - 1].id);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          opacity: isAnimating ? 1 : 0,
          transition: `opacity ${isAnimating ? '350ms' : '600ms'} cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={handleClose}
      />

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-[120]"
            onClick={() => setShowCancelConfirm(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-card rounded-2xl shadow-xl z-[130] p-5 max-w-sm mx-auto">
            <h3 className="text-lg font-semibold mb-2">Відмінити створення запису?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Всі введені дані буде втрачено
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-muted hover:bg-muted/80 font-medium transition-colors"
              >
                Продовжити
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white hover:bg-red-600 font-medium transition-colors"
              >
                Відмінити
              </button>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      <div 
        className="fixed inset-x-0 top-0 bottom-0 bg-card shadow-xl z-[110] flex flex-col overflow-hidden"
        style={{
          transform: isAnimating ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${isAnimating ? '350ms' : '600ms'} cubic-bezier(0.4, 0, 0.2, 1)`,
        }}
      >
        {/* Header */}
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'service' && step !== 'confirm' && (
                <button
                  onClick={prevStep}
                  className="h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h2 className="font-semibold">
                {step === 'service' && 'Оберіть послугу'}
                {step === 'client' && 'Клієнт'}
                {step === 'datetime' && 'Дата та час'}
                {step === 'confirm' && 'Готово!'}
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress - 4 точки */}
          <div className="flex items-center gap-1 mt-3">
            {STEPS.map((s, idx) => (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                {/* Точка */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300',
                    // Остання точка (confirm) — зелена коли активна
                    idx === STEPS.length - 1 && idx === currentStepIndex
                      ? 'bg-green-500 text-white scale-110'
                      : idx === STEPS.length - 1 && idx < currentStepIndex
                      ? 'bg-green-500 text-white'
                      // Пройдені — primary з галочкою
                      : idx < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      // Поточна — primary
                      : idx === currentStepIndex
                      ? 'bg-primary text-primary-foreground scale-110'
                      // Майбутні — muted
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {idx < currentStepIndex || (idx === STEPS.length - 1 && idx <= currentStepIndex) 
                    ? <Check className="w-4 h-4" /> 
                    : idx + 1}
                </div>
                {/* Лінія між точками */}
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-0.5 bg-muted mx-1 relative overflow-hidden">
                    {/* Анімована заливка */}
                    <div
                      className="absolute inset-y-0 left-0 bg-primary transition-all duration-500 ease-out"
                      style={{ 
                        width: idx < currentStepIndex ? '100%' : '0%'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content wrapper - плавно анімує висоту */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden"
        >
          {/* Content inner */}
          <div 
            ref={contentRef}
            className="p-4"
          >
          {/* Service Step */}
          {step === 'service' && (
            <div className="space-y-2">
              {services.length > 0 ? (
                services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                      nextStep();
                    }}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between',
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div>
                      <p className="font-medium">{service.name}</p>
                      <p className="text-sm text-muted-foreground">{service.duration} хв</p>
                    </div>
                    <p className="font-semibold">{service.price} ₴</p>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Немає активних послуг
                </div>
              )}
            </div>
          )}

          {/* Client Step */}
          {step === 'client' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Пошук клієнта..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setIsNewClient(false);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Client list or new client form */}
              {loadingClients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                {/* New client form - animated expansion */}
                <div 
                  className={`overflow-hidden transition-all duration-500 ease-out ${
                    isNewClient ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="space-y-4 pt-2 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Новий клієнт</span>
                      <button
                        onClick={() => {
                          setIsNewClient(false);
                          setNewClientName('');
                          setNewClientLastName('');
                          setNewClientPhone('');
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Скасувати
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Ім'я *</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            placeholder="Ім'я"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1.5 block">Прізвище</label>
                        <Input
                          value={newClientLastName}
                          onChange={(e) => setNewClientLastName(e.target.value)}
                          placeholder="Необов'язково"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1.5 block">Телефон *</label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3 flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span className="text-base font-medium">+380</span>
                        </div>
                        <Input
                          type="tel"
                          value={newClientPhone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="XX XXX XX XX"
                          className="pl-[5.5rem] text-base"
                          maxLength={12}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client list - hidden immediately when new client form opens */}
                <div 
                  className="overflow-hidden"
                  style={{
                    maxHeight: isNewClient ? '0px' : '500px',
                    opacity: isNewClient ? 0 : 1,
                    visibility: isNewClient ? 'hidden' : 'visible',
                    transition: isNewClient 
                      ? 'max-height 100ms ease-out, opacity 100ms ease-out, visibility 0ms 100ms' 
                      : 'max-height 500ms ease-out, opacity 400ms ease-out 100ms, visibility 0ms'
                  }}
                >
                  {(
                <>
                  {/* Add new client button */}
                  {clientSearch && filteredClients.length === 0 && (
                    <button
                      onClick={() => {
                        setIsNewClient(true);
                        setNewClientName(clientSearch);
                      }}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-primary">Додати "{clientSearch}"</p>
                        <p className="text-xs text-muted-foreground">Створити нового клієнта</p>
                      </div>
                    </button>
                  )}

                  {/* Existing clients */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {filteredClients.slice(0, 20).map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setSelectedClient(client);
                          setIsNewClient(false);
                        }}
                        className={cn(
                          'w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3',
                          selectedClient?.id === client.id
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {getInitials(client.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {client.name}{client.lastName ? ` ${client.lastName}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                        </div>
                        {selectedClient?.id === client.id && (
                          <Check className="w-5 h-5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* No search, show add button */}
                  {!clientSearch && (
                    <button
                      onClick={() => setIsNewClient(true)}
                      className="w-full p-3 rounded-xl border border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-all flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground">Новий клієнт</span>
                    </button>
                  )}
                  </>
                  )}
                </div>
                </>
              )}
            </div>
          )}

          {/* DateTime Step */}
          {step === 'datetime' && (
            <div className="space-y-6">
              {/* Selected service summary */}
              <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{selectedService?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTotalDuration()} хв • {selectedClient?.name || newClientName}
                  </p>
                </div>
                <span className="font-semibold">{selectedService?.price} ₴</span>
              </div>

              {/* Extra time buttons */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Додатковий час</p>
                <div className="flex gap-2">
                  {[0, 10, 15, 30].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setExtraTime(mins)}
                      className={cn(
                        'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all',
                        extraTime === mins
                          ? 'bg-primary text-white'
                          : 'bg-muted hover:bg-muted/80'
                      )}
                    >
                      {mins === 0 ? 'Без' : `+${mins} хв`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date picker */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Дата</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generateDays().map((date) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime('');
                        }}
                        className={cn(
                          'shrink-0 w-16 py-3 rounded-xl border text-center transition-all',
                          isSelected
                            ? 'border-primary bg-primary text-white'
                            : 'border-border hover:border-primary/50'
                        )}
                      >
                        <p className="text-xs opacity-70">{dayNames[date.getDay()]}</p>
                        <p className="text-lg font-bold">{date.getDate()}</p>
                        <p className="text-xs opacity-70">{monthNames[date.getMonth()]}</p>
                        {isToday && !isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Existing bookings strip - тільки майбутні */}
              {(() => {
                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();
                const isToday = selectedDate.toDateString() === now.toDateString();
                
                const futureBookings = masterBookings
                  .filter(b => {
                    if (b.status === 'CANCELLED') return false;
                    if (!isToday) return true; // Якщо не сьогодні — показуємо всі
                    // Для сьогодні — тільки ті що ще не закінчились
                    const [h, m] = b.time.split(':').map(Number);
                    const endMin = b.timeEnd 
                      ? (() => { const [eh, em] = b.timeEnd.split(':').map(Number); return eh * 60 + em; })()
                      : h * 60 + m + (b.duration || 60);
                    return endMin > currentMinutes;
                  })
                  .sort((a, b) => a.time.localeCompare(b.time));
                
                if (futureBookings.length === 0) return null;
                
                return (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Записи на цей день</p>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {futureBookings.map((booking) => {
                        const [h, m] = booking.time.split(':').map(Number);
                        const endMin = h * 60 + m + (booking.duration || 60);
                        const endTime = `${Math.floor(endMin / 60).toString().padStart(2, '0')}:${(endMin % 60).toString().padStart(2, '0')}`;
                        return (
                          <div
                            key={booking.id}
                            className="shrink-0 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs whitespace-nowrap"
                          >
                            <span className="font-semibold text-red-700">{booking.time}–{booking.timeEnd || endTime}</span>
                            <span className="text-red-500 ml-1.5">{booking.clientName?.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Time picker - wheel */}
              <div className="bg-zinc-900 rounded-2xl p-4">
                <TimeWheelPicker
                  startTime={selectedTime || '10:00'}
                  duration={getTotalDuration()}
                  onTimeChange={(start, end) => {
                    setSelectedTime(start);
                  }}
                  workingHours={{ start: 9, end: 20 }}
                  isToday={selectedDate.toDateString() === new Date().toDateString()}
                />
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">Запис створено!</h3>
              <p className="text-muted-foreground mb-6">
                {selectedClient?.name || newClientName} записано на {selectedService?.name}
              </p>
              <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Клієнт</span>
                  <span className="font-medium">{selectedClient?.name || newClientName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Послуга</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Дата</span>
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Час</span>
                  <span className="font-medium">{selectedTime} — {getEndTime()}</span>
                </div>
                {extraTime > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Доп. час</span>
                    <span className="font-medium">+{extraTime} хв</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Вартість</span>
                  <span className="font-bold">{selectedService?.price} ₴</span>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t shrink-0">
          {step === 'confirm' ? (
            <button
              onClick={onClose}
              className="w-full h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Закрити
            </button>
          ) : step === 'datetime' && selectedTime ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Створити запис
                </>
              )}
            </button>
          ) : (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="w-full h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Далі
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
