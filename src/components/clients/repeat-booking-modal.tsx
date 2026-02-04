'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, Clock, User,
  Calendar, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePreservedModal } from '@/hooks/use-preserved-modal';

interface Master {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
  color?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  categoryId?: string;
  categoryName?: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface PrefillService {
  id: string;
  name: string;
}

interface RepeatBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  prefillService?: PrefillService;
  salonId: string;
  onSuccess?: () => void;
}

type Step = 'services' | 'master' | 'datetime' | 'confirm';

const STEPS: { id: Step; label: string }[] = [
  { id: 'services', label: 'Послуга' },
  { id: 'master', label: 'Майстер' },
  { id: 'datetime', label: 'Час' },
  { id: 'confirm', label: 'Готово' },
];

export function RepeatBookingModal({
  isOpen,
  onClose,
  client,
  prefillService,
  salonId,
  onSuccess,
}: RepeatBookingModalProps) {
  const [step, setStep] = useState<Step>('services');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [masters, setMasters] = useState<Master[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [timeEnd, setTimeEnd] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [masterBookings, setMasterBookings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStep('services');
    setSelectedService(null);
    setSelectedMaster(null);
    setSelectedDate(new Date());
    setSelectedTime('');
    setTimeEnd('');
    setError(null);
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(isOpen, resetState);

  // Завантажити послуги при відкритті
  useEffect(() => {
    if (isOpen && services.length === 0) {
      loadServices();
    }
  }, [isOpen]);

  // Якщо є prefillService — вибрати її
  useEffect(() => {
    if (prefillService && services.length > 0) {
      const found = services.find(s => s.id === prefillService.id);
      if (found) {
        setSelectedService(found);
      }
    }
  }, [prefillService, services]);

  // Завантажити послуги салону
  const loadServices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/services?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Завантажити майстрів що надають цю послугу
  const loadMastersForService = async (serviceId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/masters?salonId=${salonId}&serviceId=${serviceId}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data);
      }
    } catch (error) {
      console.error('Error loading masters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Завантажити записи майстра на дату
  const loadMasterBookings = async (masterId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const res = await fetch(`/api/booking?masterId=${masterId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setMasterBookings(data);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  // При виборі послуги — завантажити майстрів
  useEffect(() => {
    if (selectedService) {
      loadMastersForService(selectedService.id);
    }
  }, [selectedService]);

  // При виборі майстра/дати — завантажити записи
  useEffect(() => {
    if (selectedMaster && step === 'datetime') {
      loadMasterBookings(selectedMaster.id, selectedDate);
    }
  }, [selectedMaster, selectedDate, step]);

  // Генерація слотів часу
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 15) {
        if (h === 20 && m > 0) continue;
        const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  // Перевірка чи слот зайнятий
  const isSlotBooked = (time: string) => {
    const duration = selectedService?.duration || 60;
    const [h, m] = time.split(':').map(Number);
    const slotStart = h * 60 + m;
    const slotEnd = slotStart + duration;

    return masterBookings.some(booking => {
      const [bh, bm] = booking.time.split(':').map(Number);
      const bookingStart = bh * 60 + bm;
      const bookingEnd = bookingStart + booking.duration;
      return slotStart < bookingEnd && slotEnd > bookingStart;
    });
  };

  // Перевірка чи дата минула
  const isDatePast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Перевірка чи час минув (для сьогодні)
  const isTimePast = (time: string) => {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    if (selectedDate.toDateString() === now.toDateString()) {
      return h * 60 + m <= now.getHours() * 60 + now.getMinutes();
    }
    return false;
  };

  // Розрахунок часу закінчення
  useEffect(() => {
    if (selectedTime && selectedService) {
      const [h, m] = selectedTime.split(':').map(Number);
      const endMinutes = h * 60 + m + selectedService.duration;
      const endH = Math.floor(endMinutes / 60);
      const endM = endMinutes % 60;
      setTimeEnd(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
    }
  }, [selectedTime, selectedService]);

  // Генерація 7 днів
  const generateDays = () => {
    const days = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(now.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const dayNames = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру'];

  // Збереження запису
  const handleSave = async () => {
    if (!selectedService || !selectedMaster || !selectedTime) return;

    setIsSaving(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId: selectedMaster.id,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phone,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          date: dateStr,
          time: selectedTime,
          duration: selectedService.duration,
          price: selectedService.price,
          status: 'CONFIRMED',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Помилка збереження');
      }

      setStep('confirm');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentStepIndex = STEPS.findIndex(s => s.id === step);

  const canProceed = () => {
    switch (step) {
      case 'services': return !!selectedService;
      case 'master': return !!selectedMaster;
      case 'datetime': return !!selectedTime;
      default: return false;
    }
  };

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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 bottom-4 top-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md sm:max-h-[85vh] bg-background rounded-2xl shadow-xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Повторний запис</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Client info */}
          <div className="flex items-center gap-3 p-2 bg-primary/5 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
              {getInitials(client.name)}
            </div>
            <div>
              <p className="font-medium text-sm">{client.name}</p>
              <p className="text-xs text-muted-foreground">{client.phone}</p>
            </div>
          </div>

          {/* Progress */}
          {step !== 'confirm' && (
            <div className="flex items-center gap-2 mt-4">
              {STEPS.slice(0, -1).map((s, idx) => (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                      idx < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : idx === currentStepIndex
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {idx < currentStepIndex ? <Check className="w-3 h-3" /> : idx + 1}
                  </div>
                  {idx < STEPS.length - 2 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 transition-colors',
                        idx < currentStepIndex ? 'bg-green-500' : 'bg-muted'
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Services Step */}
          {step === 'services' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Оберіть послугу</p>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left transition-all',
                      selectedService?.id === service.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {service.duration} хв
                        </p>
                      </div>
                      <p className="font-semibold">{service.price} ₴</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Master Step */}
          {step === 'master' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Оберіть майстра</p>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : masters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Немає майстрів для цієї послуги</p>
                </div>
              ) : (
                masters.map((master) => (
                  <button
                    key={master.id}
                    onClick={() => setSelectedMaster(master)}
                    className={cn(
                      'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4',
                      selectedMaster?.id === master.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
                      style={{ backgroundColor: master.color || '#8b5cf6' }}
                    >
                      {master.avatar ? (
                        <img src={master.avatar} alt={master.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(master.name)
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{master.name}</p>
                      {master.role && (
                        <p className="text-sm text-muted-foreground">{master.role}</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* DateTime Step */}
          {step === 'datetime' && (
            <div className="space-y-6">
              {/* Date picker */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">Оберіть дату</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {generateDays().map((date) => {
                    const isSelected = date.toDateString() === selectedDate.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
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

              {/* Time picker */}
              <div>
                <p className="text-sm text-muted-foreground mb-3">Оберіть час</p>
                <div className="grid grid-cols-4 gap-2">
                  {generateTimeSlots().map((time) => {
                    const booked = isSlotBooked(time);
                    const past = isTimePast(time);
                    const disabled = booked || past;
                    return (
                      <button
                        key={time}
                        onClick={() => !disabled && setSelectedTime(time)}
                        disabled={disabled}
                        className={cn(
                          'py-2.5 rounded-lg text-sm font-medium transition-all',
                          selectedTime === time
                            ? 'bg-primary text-white'
                            : disabled
                            ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                            : 'bg-white border hover:border-primary'
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">Запис створено!</h3>
              <p className="text-muted-foreground mb-6">
                {client.name} записано на {selectedService?.name}
              </p>
              <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Послуга</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Майстер</span>
                  <span className="font-medium">{selectedMaster?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Дата</span>
                  <span className="font-medium">
                    {selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Час</span>
                  <span className="font-medium">{selectedTime} — {timeEnd}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Вартість</span>
                  <span className="font-bold">{selectedService?.price} ₴</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex gap-2">
          {step === 'confirm' ? (
            <button
              onClick={onClose}
              className="flex-1 h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors"
            >
              Закрити
            </button>
          ) : (
            <>
              {currentStepIndex > 0 && (
                <button
                  onClick={prevStep}
                  className="h-12 px-4 rounded-xl border hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              {step === 'datetime' && selectedTime ? (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Підтвердити
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="flex-1 h-12 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  Далі
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
