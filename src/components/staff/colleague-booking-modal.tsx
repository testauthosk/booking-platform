'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Check, Clock, User, Phone,
  Search, Plus, Calendar, Loader2, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import { usePreservedModal } from '@/hooks/use-preserved-modal';

interface Master {
  id: string;
  name: string;
  avatar?: string;
  role?: string;
}

interface Service {
  id: string;
  name: string;
  price: number;
  duration: number;
  customPrice?: number;
  customDuration?: number;
}

interface Client {
  id: string;
  name: string;
  phone: string;
}

interface SelectedService extends Service {
  quantity: number;
}

interface ColleagueBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonId: string;
  currentMasterId: string | null;  // null для owner/admin — показати всіх
  onSuccess?: () => void;
}

type Step = 'colleague' | 'services' | 'datetime' | 'client' | 'confirm';

export function ColleagueBookingModal({
  isOpen,
  onClose,
  salonId,
  currentMasterId,
  onSuccess,
}: ColleagueBookingModalProps) {
  const [step, setStep] = useState<Step>('colleague');
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [colleagues, setColleagues] = useState<Master[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<Master | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [colleagueBookings, setColleagueBookings] = useState<any[]>([]);
  const [timeEnd, setTimeEnd] = useState<string>('');

  const resetState = useCallback(() => {
    setStep('colleague');
    setSelectedColleague(null);
    setSelectedServices([]);
    setSelectedDate(new Date());
    setSelectedTime('');
    setSelectedClient(null);
    setIsNewClient(false);
    setNewClientName('');
    setNewClientPhone('');
    setClientSearch('');
    setShowCancelConfirm(false);
  }, []);

  // Перевірка чи є введені дані
  const hasData = selectedColleague || selectedServices.length > 0 || selectedClient || newClientName || newClientPhone;

  // Обробка закриття з підтвердженням
  const handleClose = useCallback(() => {
    if (hasData) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  }, [hasData, onClose]);

  // Підтвердити скасування
  const confirmCancel = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  // Зберігати стан 3 хвилини після закриття
  usePreservedModal(isOpen, resetState);

  // Завантажити дані при відкритті (якщо ще не завантажено)
  useEffect(() => {
    if (isOpen) {
      if (colleagues.length === 0) {
        loadColleagues();
      }
      if (clients.length === 0) {
        loadClients();
      }
    }
  }, [isOpen]);

  // Завантажити послуги при виборі колеги
  useEffect(() => {
    if (selectedColleague) {
      loadServices(selectedColleague.id);
    }
  }, [selectedColleague]);

  const loadColleagues = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/masters?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        // Фільтруємо поточного мастера
        // Якщо currentMasterId = null (owner/admin) — показати всіх, інакше фільтрувати себе
        setColleagues(currentMasterId ? data.filter((m: Master) => m.id !== currentMasterId) : data);
      }
    } catch (error) {
      console.error('Error loading colleagues:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async (masterId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/staff/services?masterId=${masterId}`);
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

  const loadClients = async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // Завантажити записи колеги для вибраної дати
  const loadColleagueBookings = async (masterId: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const res = await fetch(`/api/booking?masterId=${masterId}&date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setColleagueBookings(data);
      }
    } catch (error) {
      console.error('Error loading colleague bookings:', error);
    }
  };

  // Завантажувати записи при зміні дати або колеги
  useEffect(() => {
    if (selectedColleague && step === 'datetime') {
      loadColleagueBookings(selectedColleague.id, selectedDate);
    }
  }, [selectedColleague, selectedDate, step]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.id === service.id);
      if (existing) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, { ...service, quantity: 1 }];
    });
  };

  const getTotalDuration = () => {
    return selectedServices.reduce((sum, s) => sum + (s.customDuration || s.duration), 0);
  };

  const getTotalPrice = () => {
    return selectedServices.reduce((sum, s) => sum + (s.customPrice || s.price), 0);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  );

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

  const handleSave = async () => {
    if (!selectedColleague || selectedServices.length === 0 || !selectedTime) return;
    if (!selectedClient && !isNewClient) return;
    if (isNewClient && (!newClientName || !newClientPhone)) return;

    setIsSaving(true);
    try {
      // Якщо новий клієнт — спочатку створюємо
      let clientId = selectedClient?.id;
      let clientName = selectedClient?.name || newClientName;
      let clientPhone = selectedClient?.phone || newClientPhone;

      if (isNewClient) {
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newClientName, phone: newClientPhone }),
        });
        if (clientRes.ok) {
          const newClient = await clientRes.json();
          clientId = newClient.id;
        }
      }

      // Створюємо запис
      const totalDuration = getTotalDuration();
      const [h, m] = selectedTime.split(':').map(Number);
      const endMinutes = h * 60 + m + totalDuration;
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;

      const bookingRes = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          masterId: selectedColleague.id,
          clientId,
          clientName,
          clientPhone,
          serviceName: selectedServices.map(s => s.name).join(', '),
          masterName: selectedColleague.name,
          date: selectedDate.toISOString().split('T')[0],
          time: selectedTime,
          timeEnd: endTime,
          duration: totalDuration,
          price: getTotalPrice(),
          status: 'CONFIRMED',
        }),
      });

      if (bookingRes.ok) {
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 'colleague': return !!selectedColleague;
      case 'services': return selectedServices.length > 0;
      case 'datetime': return !!selectedTime;
      case 'client': return !!selectedClient || (isNewClient && newClientName && newClientPhone);
      default: return true;
    }
  };

  const goNext = () => {
    const steps: Step[] = ['colleague', 'services', 'datetime', 'client', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1 && !isAnimating) {
      setSlideDirection('left');
      setIsAnimating(true);
      setTimeout(() => {
        setStep(steps[currentIndex + 1]);
        setTimeout(() => setIsAnimating(false), 50);
      }, 150);
    }
  };

  const goBack = () => {
    const steps: Step[] = ['colleague', 'services', 'datetime', 'client', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0 && !isAnimating) {
      setSlideDirection('right');
      setIsAnimating(true);
      setTimeout(() => {
        setStep(steps[currentIndex - 1]);
        setTimeout(() => setIsAnimating(false), 50);
      }, 150);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'colleague': return 'Оберіть колегу';
      case 'services': return `Послуги ${selectedColleague?.name}`;
      case 'datetime': return 'Дата та час';
      case 'client': return 'Клієнт';
      case 'confirm': return 'Підтвердження';
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Форматування телефону: XX XXX XX XX
  const formatPhoneDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  return (
    <>
      {/* Backdrop - high z-index to cover everything */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
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
        className={cn(
          "fixed inset-x-0 bottom-0 max-h-[90vh] bg-card rounded-t-3xl shadow-xl z-[110]",
          "transform transition-all duration-300 ease-out overflow-hidden flex flex-col",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {step !== 'colleague' && (
              <button 
                onClick={goBack}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <h2 className="font-semibold">{getStepTitle()}</h2>
          </div>
          <button 
            onClick={handleClose}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content - min-height prevents jumping */}
        <div 
          className={cn(
            "flex-1 overflow-y-auto p-4 min-h-[300px] transition-all duration-200 ease-out",
            isAnimating && slideDirection === 'left' && "opacity-0 -translate-x-4",
            isAnimating && slideDirection === 'right' && "opacity-0 translate-x-4",
            !isAnimating && "opacity-100 translate-x-0"
          )}
        >
          {/* Step 1: Colleague */}
          {step === 'colleague' && (
            <div className="space-y-2">
              {isLoading ? (
                // Skeleton loaders
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 animate-pulse">
                      <div className="h-12 w-12 rounded-2xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-24 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                    </div>
                  ))}
                </>
              ) : colleagues.length > 0 ? (
                colleagues.map((colleague) => (
                  <button
                    key={colleague.id}
                    onClick={() => setSelectedColleague(colleague)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                      selectedColleague?.id === colleague.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                    )}
                  >
                    <div className="h-12 w-12 rounded-2xl bg-violet-500 flex items-center justify-center text-white font-medium">
                      {colleague.avatar ? (
                        <img src={colleague.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover" />
                      ) : (
                        colleague.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{colleague.name}</p>
                      {colleague.role && (
                        <p className="text-sm text-muted-foreground">{colleague.role}</p>
                      )}
                    </div>
                    {selectedColleague?.id === colleague.id && (
                      <Check className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Немає колег для вибору</p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Services */}
          {step === 'services' && (
            <div className="space-y-2">
              {isLoading ? (
                // Skeleton loaders
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 animate-pulse">
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-16 bg-muted rounded" />
                      </div>
                      <div className="h-4 w-12 bg-muted rounded" />
                    </div>
                  ))}
                </>
              ) : services.length > 0 ? (
                services.map((service) => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  const price = service.customPrice || service.price;
                  const duration = service.customDuration || service.duration;
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl transition-all text-left",
                        isSelected
                          ? "bg-primary/10 border-2 border-primary"
                          : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                      )}
                    >
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-sm text-muted-foreground">{duration} хв</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{price} ₴</span>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Немає послуг</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: DateTime */}
          {step === 'datetime' && (
            <div className="space-y-4">
              {/* Date */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Дата</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const isSelected = selectedDate.toDateString() === date.toDateString();
                    const isToday = i === 0;
                    const now = new Date();
                    // Закрито якщо сьогодні і вже пізно (після 19:00)
                    const isClosed = isToday && now.getHours() >= 19;
                    
                    return (
                      <button
                        key={i}
                        onClick={() => !isClosed && setSelectedDate(new Date(date))}
                        disabled={isClosed}
                        className={cn(
                          "flex flex-col items-center px-3 py-2 rounded-xl shrink-0 transition-all",
                          isClosed 
                            ? "bg-muted/30 text-muted-foreground/50 cursor-not-allowed"
                            : isSelected 
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/50 hover:bg-muted"
                        )}
                      >
                        <span className="text-xs">{date.toLocaleDateString('uk-UA', { weekday: 'short' })}</span>
                        <span className="text-lg font-bold">{date.getDate()}</span>
                        {isClosed && <span className="text-[10px]">закрито</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colleague's bookings for this day */}
              {colleagueBookings.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Записи {selectedColleague?.name} на цей день
                  </p>
                  <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                    {colleagueBookings.map((booking: any) => (
                      <div 
                        key={booking.id}
                        className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg text-sm"
                      >
                        <span className="font-medium">{booking.time} - {booking.timeEnd || '?'}</span>
                        <span className="text-muted-foreground truncate ml-2">{booking.clientName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Wheel Picker */}
              <div className="bg-zinc-900 rounded-2xl p-4">
                <TimeWheelPicker
                  startTime={selectedTime || '10:00'}
                  duration={getTotalDuration()}
                  onTimeChange={(start, end) => {
                    setSelectedTime(start);
                    setTimeEnd(end);
                  }}
                  workingHours={{ start: 9, end: 20 }}
                  isToday={selectedDate.toDateString() === new Date().toDateString()}
                />
              </div>
            </div>
          )}

          {/* Step 4: Client */}
          {step === 'client' && (
            <div className="space-y-4">
              {!isNewClient ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Пошук клієнта..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/50 border-none outline-none"
                    />
                  </div>

                  {/* Clients list */}
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <button
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                            selectedClient?.id === client.id
                              ? "bg-primary/10 border-2 border-primary"
                              : "bg-muted/50 hover:bg-muted border-2 border-transparent"
                          )}
                        >
                          <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white font-medium">
                            {client.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                          </div>
                          {selectedClient?.id === client.id && (
                            <Check className="h-5 w-5 text-primary ml-auto" />
                          )}
                        </button>
                      ))
                    ) : clientSearch ? (
                      // Не знайдено — показати кнопку додати
                      <div className="text-center py-4">
                        <p className="text-muted-foreground mb-3">Клієнта "{clientSearch}" не знайдено</p>
                        <button
                          onClick={() => {
                            // Визначити чи це ім'я чи телефон
                            const isPhone = /^\d+$/.test(clientSearch.replace(/\s/g, ''));
                            if (isPhone) {
                              setNewClientPhone(clientSearch.replace(/\D/g, '').slice(0, 9));
                            } else {
                              setNewClientName(clientSearch);
                            }
                            setIsNewClient(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Додати "{clientSearch}"
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Add new client button - тільки якщо є клієнти */}
                  {(filteredClients.length > 0 || !clientSearch) && (
                    <button
                      onClick={() => setIsNewClient(true)}
                      className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="font-medium">Додати нового клієнта</span>
                    </button>
                  )}
                </>
              ) : (
                /* New client form */
                <div className="space-y-4">
                  <button
                    onClick={() => setIsNewClient(false)}
                    className="text-sm text-primary flex items-center gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Обрати існуючого
                  </button>

                  <div>
                    <label className="text-sm text-muted-foreground">Ім'я *</label>
                    <input
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Ім'я клієнта"
                      className="w-full mt-1 px-4 py-3 rounded-xl bg-muted/50 border-none outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground">Телефон *</label>
                    <div className="flex mt-1">
                      <span className="px-3 py-3 bg-muted rounded-l-xl text-muted-foreground text-base">+380</span>
                      <input
                        type="tel"
                        value={formatPhoneDisplay(newClientPhone)}
                        onChange={(e) => setNewClientPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="XX XXX XX XX"
                        className="flex-1 px-4 py-3 rounded-r-xl bg-muted/50 border-none outline-none text-base"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-violet-500 flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Майстер</p>
                    <p className="font-medium">{selectedColleague?.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-500 flex items-center justify-center text-white">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Клієнт</p>
                    <p className="font-medium">
                      {selectedClient?.name || newClientName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedClient?.phone || `+380${newClientPhone}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-green-500 flex items-center justify-center text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Дата та час</p>
                    <p className="font-medium">
                      {formatDate(selectedDate)}, {selectedTime} - {(() => {
                        const [h, m] = selectedTime.split(':').map(Number);
                        const endMinutes = h * 60 + m + getTotalDuration();
                        return `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`;
                      })()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground mb-2">Послуги</p>
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between text-sm py-1">
                      <span>{s.name}</span>
                      <span>{s.customPrice || s.price} ₴</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t mt-2">
                    <span>Всього ({getTotalDuration()} хв)</span>
                    <span>{getTotalPrice()} ₴</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0">
          {step === 'confirm' ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  Створити запис
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canGoNext()}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Далі
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {['colleague', 'services', 'datetime', 'client', 'confirm'].map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                step === s ? "w-6 bg-primary" : "w-1.5 bg-muted"
              )}
            />
          ))}
        </div>
      </div>
    </>
  );
}
