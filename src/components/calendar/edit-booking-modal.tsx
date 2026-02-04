'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Clock, Calendar, Scissors, Plus, Minus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, addDays, isSameDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePreservedModal } from '@/hooks/use-preserved-modal';

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: {
    id: string;
    serviceId?: string;
    serviceName?: string;
    date: string;
    time: string;
    duration: number;
    extraTime?: number;
    masterId?: string;
  } | null;
  services: Service[];
  onSave: (data: {
    id: string;
    serviceId?: string;
    date: string;
    time: string;
    duration: number;
    extraTime: number;
  }) => Promise<void>;
}

export function EditBookingModal({ isOpen, onClose, booking, services, onSave }: EditBookingModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [extraTime, setExtraTime] = useState<number>(0); // Додатковий час в хвилинах

  const resetState = useCallback(() => {
    setSelectedServiceId('');
    setSelectedDate(new Date());
    setSelectedTime('');
    setExtraTime(0);
  }, []);

  usePreservedModal(isOpen, resetState);

  // Ініціалізація при відкритті
  useEffect(() => {
    if (isOpen && booking) {
      setSelectedServiceId(booking.serviceId || '');
      setSelectedDate(new Date(booking.date));
      setSelectedTime(booking.time);
      setExtraTime(booking.extraTime || 0);
    }
  }, [isOpen, booking]);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
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

  // Чи є зміни
  const hasChanges = 
    selectedServiceId !== (booking.serviceId || '') ||
    !isSameDay(selectedDate, new Date(booking.date)) ||
    selectedTime !== booking.time ||
    extraTime !== (booking.extraTime || 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300",
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        "fixed inset-x-4 bottom-24 lg:inset-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2",
        "lg:w-full lg:max-w-md bg-background rounded-2xl shadow-xl z-50",
        "max-h-[80vh] overflow-hidden flex flex-col",
        "transition-all duration-300",
        isAnimating 
          ? 'opacity-100 translate-y-0 lg:scale-100' 
          : 'opacity-0 translate-y-8 lg:translate-y-0 lg:scale-95'
      )}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between shrink-0">
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
          {/* Послуга */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Scissors className="h-4 w-4 text-muted-foreground" />
              Послуга
            </label>
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

          {/* Час */}
          <div>
            <label className="text-sm font-medium flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Час
            </label>
            <div className="grid grid-cols-4 gap-1.5 max-h-28 overflow-y-auto">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  onClick={() => setSelectedTime(slot)}
                  className={cn(
                    "py-2 rounded-lg text-sm transition-all",
                    selectedTime === slot
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  {slot}
                </button>
              ))}
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
        <div className="p-4 border-t flex gap-2 shrink-0 pb-6 lg:pb-4">
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
