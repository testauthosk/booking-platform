'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, ChevronRight, ChevronLeft, Check, Clock, User, Phone,
  Search, Plus, Calendar, Loader2, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { usePreservedModal } from '@/hooks/use-preserved-modal';

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
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [extraTime, setExtraTime] = useState(0); // Додатковий час в хвилинах
  
  // Client
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
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
    setNewClientPhone('');
    setClientSearch('');
    setSelectedDate(new Date());
    setSelectedTime('');
    setError(null);
  }, []);

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

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const res = await fetch('/api/clients');
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
      const res = await fetch(`/api/booking?masterId=${masterId}&date=${dateStr}`);
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

  // Генерація слотів часу
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let h = 9; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
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
      let clientName = selectedClient?.name || newClientName;
      let clientPhone = selectedClient?.phone || ('+380' + newClientPhone.replace(/\D/g, ''));

      if (isNewClient) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: newClientName, 
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 max-h-[90vh] bg-card rounded-t-3xl shadow-xl z-[110] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== 'service' && step !== 'confirm' && (
                <button
                  onClick={prevStep}
                  className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
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
              onClick={onClose}
              className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Progress */}
          {step !== 'confirm' && (
            <div className="flex items-center gap-2 mt-3">
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
              ) : isNewClient ? (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Новий клієнт</span>
                    <button
                      onClick={() => setIsNewClient(false)}
                      className="text-xs text-primary hover:underline"
                    >
                      Скасувати
                    </button>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Ім'я</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Введіть ім'я"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Телефон</label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="text-sm font-medium">+380</span>
                      </div>
                      <Input
                        type="tel"
                        value={newClientPhone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="XX XXX XX XX"
                        className="pl-[5.5rem]"
                        maxLength={12}
                      />
                    </div>
                  </div>
                </div>
              ) : (
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
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
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
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {getInitials(client.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{client.name}</p>
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
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Plus className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground">Новий клієнт</span>
                    </button>
                  )}
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

              {/* Time picker */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Час</p>
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
                            ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                            : 'bg-white border hover:border-primary'
                        )}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time summary */}
              {selectedTime && (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-center">
                  <p className="text-green-700 font-medium">
                    {selectedTime} — {getEndTime()}
                  </p>
                  <p className="text-xs text-green-600">
                    {getTotalDuration()} хв ({selectedService?.duration} + {extraTime} доп.)
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confirm Step */}
          {step === 'confirm' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
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
