// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePreservedModal } from "@/hooks/use-preserved-modal";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ChevronDown, Star, Check, Plus, Calendar, Clock, User, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
// supabase removed - using API instead
import { createBooking } from "@/lib/api";

// Types
interface Service {
  id: string;
  name: string;
  duration: string;
  durationMinutes: number; // Added for time calculation
  price: number;
  priceFrom?: boolean;
}

interface Specialist {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  reviewCount?: number;
  price: number;
  serviceIds?: string[];
  servicePrices?: Record<string, number>;
}

interface TimeSlot {
  time: string;
  available: boolean;
  booked?: boolean; // For test data
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonId: string;
  salonName: string;
  salonImage: string;
  salonRating: number;
  salonReviews: number;
  salonAddress: string;
  services: { category: string; items: Service[] }[];
  specialists: Specialist[];
  initialCategory?: string;
  preSelectedServiceId?: string;
}

// Step indicator component - scrollable on mobile with click navigation
function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  completedSteps,
}: {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to current step on mobile
  useEffect(() => {
    if (containerRef.current) {
      const activeButton = containerRef.current.querySelector(`[data-step="${currentStep}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentStep]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-1 sm:gap-2 text-sm text-gray-500 overflow-x-auto scrollbar-hide max-w-[60vw] sm:max-w-none"
    >
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isCurrent = index === currentStep;
        const canClick = isCompleted && index < currentStep && currentStep < steps.length - 1; // Can't go back from "Готово"

        return (
          <div key={step} className="flex items-center shrink-0">
            <button
              data-step={index}
              onClick={() => canClick && onStepClick(index)}
              disabled={!canClick}
              className={`transition-colors whitespace-nowrap px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm ${
                isCurrent
                  ? "text-white bg-gray-900 font-medium"
                  : isCompleted
                    ? "text-gray-700 bg-gray-100 font-medium cursor-pointer hover:bg-gray-200"
                    : "text-gray-400"
              } ${!canClick && !isCurrent ? "cursor-default" : ""}`}
            >
              {step}
            </button>
            {index < steps.length - 1 && (
              <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mx-0.5 sm:mx-1 text-gray-300 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Sidebar summary component
function BookingSummary({
  salonName,
  salonImage,
  salonRating,
  salonReviews,
  salonAddress,
  selectedServices,
  selectedSpecialist,
  selectedDate,
  selectedTimes,
  specialists,
  services,
  totalDurationMinutes,
}: {
  salonName: string;
  salonImage: string;
  salonRating: number;
  salonReviews: number;
  salonAddress: string;
  selectedServices: string[];
  selectedSpecialist: string | null;
  selectedDate: Date | null;
  selectedTimes: string[];
  specialists: Specialist[];
  services: { category: string; items: Service[] }[];
  totalDurationMinutes: number;
}) {
  const allServices = services.flatMap(c => c.items);
  const selectedServiceItems = allServices.filter(s => selectedServices.includes(s.id));
  const specialist = specialists.find(s => s.id === selectedSpecialist);

  const total = selectedServiceItems.reduce((sum, s) => sum + s.price, 0);

  const formatDate = (date: Date) => {
    const days = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"];
    const months = ["січня", "лютого", "березня", "квітня", "травня", "червня",
                    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours} г ${mins} хв` : `${hours} г`;
    }
    return `${minutes} хв`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Salon info */}
      <div className="p-5 border-b border-gray-200">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
            <Image src={salonImage} alt={salonName} width={64} height={64} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900">{salonName}</h3>
            <div className="flex items-center gap-1 text-sm">
              <span className="font-semibold">{salonRating}</span>
              <div className="flex">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <span className="text-blue-600">({salonReviews.toLocaleString()} відгуків)</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{salonAddress}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      {selectedDate && selectedTimes.length > 0 && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {selectedTimes[0]} - {selectedTimes[selectedTimes.length - 1]} (тривалість {formatDuration(totalDurationMinutes)})
            </span>
          </div>
        </div>
      )}

      {/* Selected services */}
      {selectedServiceItems.length > 0 && (
        <div className="p-5 space-y-4">
          {selectedServiceItems.map(service => (
            <div key={service.id} className="flex justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{service.name.toUpperCase()}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {service.duration}
                  {specialist && ` з ${specialist.name}`}
                </p>
              </div>
              <span className="font-semibold text-gray-900 text-sm">{service.price} ₴</span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {selectedServiceItems.length > 0 && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-between">
            <span className="font-bold text-gray-900">Всього до оплати</span>
            <span className="font-bold text-gray-900">{total} ₴</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Confirmation dialog component
function ConfirmCloseDialog({
  isOpen,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="text-center pt-2">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Ви точно хочете перервати це бронювання?
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Всі вибрані параметри будуть скинуті.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-medium text-gray-900 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            >
              Відмінити
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 rounded-xl bg-gray-900 font-medium text-white hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
            >
              Вийти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookingModal({
  isOpen,
  onClose,
  salonId,
  salonName,
  salonImage,
  salonRating,
  salonReviews,
  salonAddress,
  services,
  specialists,
  initialCategory,
  preSelectedServiceId,
}: BookingModalProps) {
  const [currentStep, _setCurrentStep] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const setCurrentStep = useCallback((v: number | ((prev: number) => number)) => {
    _setCurrentStep(v);
    // Scroll content to top on step change
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0 });
    });
  }, []);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Form fields for confirmation step
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bookedClientId, setBookedClientId] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Accordion state for services catalog
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const accordionContentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const steps = ["Послуги", "Фахівець", "Час", "Підтвердження", "Готово"];

  const resetState = useCallback(() => {
    setCurrentStep(0);
    setSelectedServices([]);
    setSelectedSpecialist(null);
    setSelectedDate(null);
    setSelectedTimes([]);
    setCompletedSteps([]);
    setFirstName("");
    setLastName("");
    setPhone("");
  }, []);

  // Зберігати стан 3 хв після закриття
  usePreservedModal(isOpen, resetState);

  // Toggle single accordion category
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      // Update allExpanded state
      const allCats = services.map(c => c.category);
      setAllExpanded(allCats.every(c => next.has(c)));
      return next;
    });
  }, [services]);

  // Toggle all categories
  const toggleAllCategories = useCallback(() => {
    if (allExpanded) {
      setExpandedCategories(new Set());
      setAllExpanded(false);
    } else {
      const allCats = new Set(services.map(c => c.category));
      setExpandedCategories(allCats);
      setAllExpanded(true);
    }
  }, [allExpanded, services]);

  // Handle initialCategory and preSelectedServiceId when modal opens
  useEffect(() => {
    if (isOpen) {
      // Pre-select service if provided
      if (preSelectedServiceId) {
        setSelectedServices(prev => {
          if (prev.includes(preSelectedServiceId)) return prev;
          return [preSelectedServiceId];
        });
        // Find which category this service belongs to and expand it
        for (const cat of services) {
          const found = cat.items.find(s => s.id === preSelectedServiceId);
          if (found) {
            setExpandedCategories(new Set([cat.category]));
            break;
          }
        }
      } else if (initialCategory) {
        // Expand initial category
        setExpandedCategories(new Set([initialCategory]));
      } else {
        // Default: all collapsed
        setExpandedCategories(new Set());
      }
      setAllExpanded(false);
    }
  }, [isOpen, initialCategory, preSelectedServiceId, services]);

  // Scroll to initial category after modal opens
  useEffect(() => {
    if (isOpen && currentStep === 0) {
      const targetCategory = initialCategory || (preSelectedServiceId
        ? services.find(c => c.items.some(s => s.id === preSelectedServiceId))?.category
        : null);

      if (targetCategory) {
        setTimeout(() => {
          const el = categoryRefs.current[targetCategory];
          if (el) {
            const container = el.closest('.overflow-y-auto');
            if (container) {
              const targetPos = el.offsetTop - 80;
              container.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
          }
        }, 400);
      }
    }
  }, [isOpen, currentStep, initialCategory, preSelectedServiceId, services]);

  // Smooth close with animation
  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  // Calculate total duration based on selected services
  const allServices = services.flatMap(c => c.items);
  const selectedServiceItems = allServices.filter(s => selectedServices.includes(s.id));

  const totalDurationMinutes = selectedServiceItems.reduce((sum, s) => {
    return sum + (s.durationMinutes || 30); // Default 30 min if not specified
  }, 0);

  // Round to nearest 30 min slot
  const roundedDuration = Math.ceil(totalDurationMinutes / 30) * 30;
  const requiredSlots = roundedDuration / 30;

  // Generate dates for calendar (next 30 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Fetch available time slots from database
  const fetchTimeSlots = async (date: Date, masterId: string | null): Promise<TimeSlot[]> => {
    const dateStr = date.toISOString().split('T')[0];

    // Get slots from API
    try {
      const params = new URLSearchParams({
        salonId,
        date: dateStr,
        ...(masterId && masterId !== 'any' ? { masterId } : {}),
      });
      const res = await fetch(`/api/slots?${params}`);
      if (res.ok) {
        const slots = await res.json();
        return slots.map((s: any) => ({
          time: s.time,
          available: s.available,
          booked: !s.available,
        }));
      }
    } catch (err) {
      console.error('Error loading slots:', err);
    }

    // Fallback: all times available
    const allTimes = [
      "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
      "18:00", "18:30", "19:00"
    ];
    return allTimes.map(time => ({ time, available: true, booked: false }));
  };

  const dates = generateDates();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotSelectionError, setSlotSelectionError] = useState<string | null>(null);
  const timeSlotsRef = useRef<HTMLDivElement>(null);

  // Bulk availability: which dates have enough consecutive free slots
  const [dateAvailability, setDateAvailability] = useState<Record<string, { hasAvailability: boolean; freeSlots: number }>>({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  // Fetch bulk availability when entering time step
  useEffect(() => {
    if (currentStep === 2 && salonId) {
      setLoadingAvailability(true);
      const dateStrs = dates.slice(0, 14).map(d => d.toISOString().split('T')[0]).join(',');
      const params = new URLSearchParams({
        salonId,
        dates: dateStrs,
        duration: String(roundedDuration),
        ...(selectedSpecialist && selectedSpecialist !== 'any' ? { masterId: selectedSpecialist } : {}),
      });
      fetch(`/api/slots/bulk?${params}`)
        .then(r => r.ok ? r.json() : {})
        .then(data => setDateAvailability(data))
        .catch(() => {})
        .finally(() => setLoadingAvailability(false));
    }
  }, [currentStep, salonId, selectedSpecialist, roundedDuration]);

  useEffect(() => {
    if (selectedDate) {
      setLoadingSlots(true);
      setSelectedTimes([]);
      setSlotSelectionError(null);

      fetchTimeSlots(selectedDate, selectedSpecialist).then(slots => {
        setTimeSlots(slots);
        setLoadingSlots(false);
      });

      // Auto-scroll to time slots after date selection - smooth custom animation
      setTimeout(() => {
        const element = timeSlotsRef.current;
        if (element) {
          const container = element.closest('.overflow-y-auto');
          if (container) {
            const targetPosition = element.offsetTop - 120;
            const startPosition = container.scrollTop;
            const distance = targetPosition - startPosition;
            const duration = 600;
            let startTime: number | null = null;

            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const animation = (currentTime: number) => {
              if (startTime === null) startTime = currentTime;
              const timeElapsed = currentTime - startTime;
              const progress = Math.min(timeElapsed / duration, 1);
              const easedProgress = easeOutCubic(progress);

              container.scrollTop = startPosition + distance * easedProgress;

              if (timeElapsed < duration) {
                requestAnimationFrame(animation);
              }
            };

            requestAnimationFrame(animation);
          }
        }
      }, 200);
    }
  }, [selectedDate]);

  // Auto-select consecutive slots with animation
  const handleTimeSlotClick = (clickedTime: string) => {
    setSlotSelectionError(null);

    const clickedIndex = timeSlots.findIndex(s => s.time === clickedTime);
    if (clickedIndex === -1) return;

    // Check if we can fit required slots starting from clicked time
    const neededSlots: string[] = [];
    let canFit = true;

    for (let i = 0; i < requiredSlots; i++) {
      const slotIndex = clickedIndex + i;
      if (slotIndex >= timeSlots.length) {
        canFit = false;
        break;
      }
      const slot = timeSlots[slotIndex];
      if (!slot.available) {
        canFit = false;
        break;
      }
      neededSlots.push(slot.time);
    }

    if (!canFit) {
      setSlotSelectionError(`Потрібно ${requiredSlots} слотів підряд (${roundedDuration} хв). Оберіть інший час.`);
      setSelectedTimes([]);

      // On mobile, scroll to top of time slots smoothly
      setTimeout(() => {
        const element = timeSlotsRef.current;
        if (element && window.innerWidth < 1024) {
          const container = element.closest('.overflow-y-auto');
          if (container) {
            const targetPosition = element.offsetTop - 100;
            const startPosition = container.scrollTop;
            const distance = targetPosition - startPosition;
            const duration = 500;
            let startTime: number | null = null;

            const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

            const animation = (currentTime: number) => {
              if (startTime === null) startTime = currentTime;
              const timeElapsed = currentTime - startTime;
              const progress = Math.min(timeElapsed / duration, 1);
              const easedProgress = easeOutCubic(progress);

              container.scrollTop = startPosition + distance * easedProgress;

              if (timeElapsed < duration) {
                requestAnimationFrame(animation);
              }
            };

            requestAnimationFrame(animation);
          }
        }
      }, 100);

      // Auto-hide error after 4 seconds
      setTimeout(() => {
        setSlotSelectionError(null);
      }, 4000);

      return;
    }

    // Animate selection step by step (slots are pre-checked so no phantom effect)
    setSelectedTimes([]);
    neededSlots.forEach((time, index) => {
      setTimeout(() => {
        setSelectedTimes(prev => [...prev, time]);
      }, index * 100);
    });
  };

  const getDayName = (date: Date) => {
    const days = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
    return days[date.getDay()];
  };

  const getMonthName = (date: Date) => {
    const months = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
                    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    return months[date.getMonth()];
  };

  const getFullMonthName = (date: Date) => {
    const months = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
                    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    return months[date.getMonth()];
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return selectedServices.length > 0;
      case 1: return selectedSpecialist !== null;
      case 2: return selectedDate !== null && selectedTimes.length === requiredSlots;
      case 3: return firstName.trim() !== "" && lastName.trim() !== "" && phone.replace(/\s/g, '').length >= 9;
      default: return true;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1 && canProceed()) {
      // If we're on confirmation step (step 3), submit the booking
      if (currentStep === 3) {
        setIsSubmitting(true);
        try {
          const booking = await createBooking({
            salonId: salonId,
            serviceId: selectedServices[0], // Primary service
            masterId: selectedSpecialist === 'any' ? specialists[0]?.id : selectedSpecialist!,
            clientName: `${firstName} ${lastName}`,
            clientPhone: `+380${phone.replace(/\s/g, '')}`,
            ...(email.trim() && email.includes('@') ? { clientEmail: email.trim().toLowerCase() } : {}),
            date: selectedDate!.toISOString().split('T')[0],
            time: selectedTimes[0],
            duration: roundedDuration,
            price: selectedServiceItems.reduce((sum, s) => sum + s.price, 0),
            notes: selectedServices.length > 1
              ? `Додаткові послуги: ${selectedServiceItems.slice(1).map(s => s.name).join(', ')}`
              : undefined,
          });

          if (!booking) {
            throw new Error('Помилка створення бронювання');
          }
          if (booking.clientId) {
            setBookedClientId(booking.clientId);
          }
        } catch (error: any) {
          console.error('Booking error:', error);
          const msg = error?.message || 'Помилка при створенні бронювання. Спробуйте ще раз.';
          alert(msg);
          setIsSubmitting(false);
          return;
        }
        setIsSubmitting(false);
      }

      setCompletedSteps(prev => [...prev.filter(s => s !== currentStep), currentStep]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0 && currentStep < steps.length - 1) { // Can't go back from "Готово"
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (step: number) => {
    if (completedSteps.includes(step) && step < currentStep && currentStep < steps.length - 1) {
      setCurrentStep(step);
    }
  };

  // Lock ALL scroll when modal is open (body + any overflow-y-auto containers)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.querySelectorAll('.overflow-y-auto').forEach(el => {
        (el as HTMLElement).style.overflow = 'hidden';
      });
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.querySelectorAll('.overflow-y-auto').forEach(el => {
        (el as HTMLElement).style.overflow = '';
      });
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.querySelectorAll('.overflow-y-auto').forEach(el => {
        (el as HTMLElement).style.overflow = '';
      });
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentStep(0);
      setSelectedServices([]);
      setSelectedSpecialist(null);
      setSelectedDate(null);
      setSelectedTimes([]);
      setShowConfirmClose(false);
      setCompletedSteps([]);
      setFirstName("");
      setLastName("");
      setPhone("");
      setSlotSelectionError(null);
    }
  }, [isOpen]);

  // Check if user has made any selections
  const hasSelections = selectedServices.length > 0 || selectedSpecialist !== null || selectedDate !== null;

  const handleCloseAttempt = () => {
    if (hasSelections && currentStep < steps.length - 1) {
      setShowConfirmClose(true);
    } else {
      handleSmoothClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    handleSmoothClose();
  };

  // Calendar navigation
  const goToPrevMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCalendarMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  // Generate calendar days for current month view
  const generateCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: (Date | null)[] = [];

    // Add empty slots for days before first day of month
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm ${isClosing ? 'booking-backdrop-exit' : 'booking-backdrop-enter'}`}
        onClick={handleCloseAttempt}
      />
      {/* Content panel */}
      <div className={`relative w-full h-full lg:h-[90vh] lg:max-w-[1100px] lg:rounded-2xl bg-white overflow-hidden shadow-2xl ${isClosing ? 'booking-content-exit' : 'booking-content-enter'}`}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-6 h-14 sm:h-16 border-b border-gray-100 shrink-0">
          {/* Back/Close button - always visible */}
          <button
            onClick={currentStep > 0 && currentStep < steps.length - 1 ? handleBack : handleCloseAttempt}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            {currentStep > 0 && currentStep < steps.length - 1 ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <X className="w-5 h-5 text-gray-600" />
            )}
          </button>

          <StepIndicator
            steps={steps}
            currentStep={currentStep}
            onStepClick={handleStepClick}
            completedSteps={completedSteps}
          />

          {/* Close button - always visible on mobile too */}
          <button
            onClick={handleCloseAttempt}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex gap-8">
            {/* Main content */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-4">
              {/* Step 0: Services — Accordion catalog */}
              {currentStep === 0 && (
                <div className="animate-fadeIn">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Оберіть послуги</h1>
                    <button
                      onClick={toggleAllCategories}
                      className="text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                    >
                      {allExpanded ? "Згорнути всі" : "Розгорнути всі"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {services.map((category, catIdx) => {
                      const isExpanded = expandedCategories.has(category.category);
                      const selectedInCategory = category.items.filter(s => selectedServices.includes(s.id)).length;

                      return (
                        <div
                          key={category.category}
                          ref={(el) => { categoryRefs.current[category.category] = el; }}
                          className="rounded-2xl border border-gray-100 overflow-hidden bg-white"
                          style={{
                            animation: `fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                            animationDelay: `${catIdx * 60}ms`,
                            opacity: 0,
                          }}
                        >
                          {/* Category header — clickable */}
                          <button
                            onClick={() => toggleCategory(category.category)}
                            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                                {category.category}
                              </h3>
                              {selectedInCategory > 0 && (
                                <span className="bg-gray-900 text-white text-xs font-medium px-2 py-0.5 rounded-lg">
                                  {selectedInCategory}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{category.items.length} послуг</span>
                              <ChevronDown
                                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ease-out ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                              />
                            </div>
                          </button>

                          {/* Accordion content with smooth height animation */}
                          <div
                            className="transition-all duration-300 ease-out overflow-hidden"
                            style={{
                              maxHeight: isExpanded
                                ? `${(accordionContentRefs.current[category.category]?.scrollHeight || 1000) + 20}px`
                                : "0px",
                              opacity: isExpanded ? 1 : 0,
                            }}
                          >
                            <div
                              ref={(el) => { accordionContentRefs.current[category.category] = el; }}
                              className="px-4 pb-4 space-y-2"
                            >
                              {category.items.map((service) => {
                                const isSelected = selectedServices.includes(service.id);
                                return (
                                  <div
                                    key={service.id}
                                    onClick={() => toggleService(service.id)}
                                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-sm ${
                                      isSelected
                                        ? "border-gray-900 bg-gray-50/50"
                                        : "border-gray-100 bg-white hover:border-gray-300"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                                        <p className="text-sm text-gray-500 mt-0.5">{service.duration}</p>
                                        <p className="text-sm font-medium text-gray-900 mt-1">
                                          <span className="text-gray-500 font-normal">від </span>
                                          {service.price} ₴
                                        </p>
                                      </div>
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                                        isSelected ? "bg-gray-900 scale-110" : "border-2 border-gray-200 hover:border-gray-400"
                                      }`}>
                                        {isSelected ? (
                                          <Check className="w-4 h-4 text-white" />
                                        ) : (
                                          <Plus className="w-4 h-4 text-gray-400" />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Duration info */}
                  {selectedServices.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">Загальна тривалість:</span> {roundedDuration} хв ({requiredSlots} слотів по 30 хв)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Specialist */}
              {currentStep === 1 && (
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Оберіть фахівця</h1>

                  {/* Total price for selected services */}
                  {selectedServiceItems.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="text-sm text-gray-600">
                        Обрано послуг: <span className="font-medium text-gray-900">{selectedServiceItems.length}</span>
                        {" · "}
                        Сума: <span className="font-medium text-gray-900">{selectedServiceItems.reduce((s, sv) => s + sv.price, 0)} ₴</span>
                      </p>
                    </div>
                  )}

                  {/* Any specialist option — always first */}
                  <div
                    onClick={() => setSelectedSpecialist("any")}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md mb-3 ${
                      selectedSpecialist === "any"
                        ? "border-gray-900 bg-gray-50/50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Будь-який вільний фахівець</h3>
                          <p className="text-sm text-gray-500">для гнучкого бронювання</p>
                        </div>
                      </div>
                      {selectedSpecialist === "any" ? (
                        <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center scale-110 transition-transform">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Button variant="outline" className="rounded-xl hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
                          Обрати
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Specialists list — filtered by selected services */}
                  <div className="space-y-3">
                    {specialists
                      .filter(sp => {
                        // Hide specialists without serviceIds (not configured)
                        if (!sp.serviceIds || sp.serviceIds.length === 0) return false;
                        // Check they can do ALL selected services
                        return selectedServices.every(sid => sp.serviceIds!.includes(sid));
                      })
                      .map(specialist => {
                      const isSelected = selectedSpecialist === specialist.id;
                      // Calculate price from specialist's custom prices, fallback to service default
                      const totalForSpecialist = selectedServiceItems.reduce((s, sv) => {
                        const customPrice = specialist.servicePrices?.[sv.id];
                        return s + (customPrice ?? sv.price);
                      }, 0);
                      return (
                        <div
                          key={specialist.id}
                          onClick={() => setSelectedSpecialist(specialist.id)}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? "border-gray-900 bg-gray-50/50 shadow-sm"
                              : "border-gray-100 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-white shadow-md">
                                  {specialist.avatar ? (
                                    <Image
                                      src={specialist.avatar}
                                      alt={specialist.name}
                                      width={56}
                                      height={56}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                      <span className="text-xl font-bold text-gray-500">{specialist.name?.charAt(0)?.toUpperCase()}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-xl px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 border border-gray-100">
                                  <span className="text-xs font-bold text-gray-900">{specialist.rating}</span>
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{specialist.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{specialist.role}</p>
                                {totalForSpecialist > 0 && (
                                  <p className="text-sm font-medium text-gray-900 mt-0.5">{totalForSpecialist} ₴</p>
                                )}
                              </div>
                            </div>
                            {isSelected ? (
                              <div className="w-8 h-8 rounded-xl bg-gray-900 flex items-center justify-center scale-110 transition-transform">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <Button variant="outline" className="rounded-xl hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
                                Обрати
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2: Time */}
              {currentStep === 2 && (
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Виберіть час</h1>

                  {/* Duration reminder */}
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Потрібно обрати:</span> {requiredSlots} слотів підряд ({roundedDuration} хв)
                    </p>
                  </div>

                  {/* Specialist chip + Calendar button */}
                  <div className="flex items-center gap-2 mb-6">
                    {selectedSpecialist && selectedSpecialist !== "any" && (
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-100">
                        <div className="w-6 h-6 rounded-xl overflow-hidden bg-gray-200">
                          <Image
                            src={specialists.find(s => s.id === selectedSpecialist)?.avatar || ""}
                            alt=""
                            width={24}
                            height={24}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {specialists.find(s => s.id === selectedSpecialist)?.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => setCalendarOpen(!calendarOpen)}
                      className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                        calendarOpen ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <Calendar className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Full Calendar View */}
                  {calendarOpen && (
                    <div className="mb-6 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={goToPrevMonth}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h3 className="font-semibold text-gray-900">
                          {getFullMonthName(calendarMonth)} {calendarMonth.getFullYear()}
                        </h3>
                        <button
                          onClick={goToNextMonth}
                          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-gray-100 cursor-pointer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Weekday headers */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1">
                        {generateCalendarDays().map((date, index) => {
                          if (!date) {
                            return <div key={`empty-${index}`} className="aspect-square" />;
                          }

                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isPast = date < today;
                          const isSelected = selectedDate?.toDateString() === date.toDateString();
                          const isToday = date.toDateString() === today.toDateString();
                          const calDateStr = date.toISOString().split('T')[0];
                          const calDayInfo = dateAvailability[calDateStr];
                          const calNoAvail = !isPast && calDayInfo && !calDayInfo.hasAvailability;

                          return (
                            <button
                              key={date.toISOString()}
                              onClick={() => !isPast && !calNoAvail && setSelectedDate(date)}
                              disabled={isPast || !!calNoAvail}
                              className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all cursor-pointer ${
                                isPast || calNoAvail
                                  ? "text-gray-300 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-violet-500 text-white"
                                    : isToday
                                      ? "bg-gray-100 text-gray-900 hover:bg-gray-200"
                                      : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Horizontal date selector */}
                  {!calendarOpen && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-medium text-gray-700">
                          {getMonthName(dates[0])} {dates[0].getFullYear()} р.
                        </h2>
                      </div>

                      <div className="flex gap-2 mb-6 pt-1 pb-2 overflow-x-auto scrollbar-hide">
                        {dates.slice(0, 14).map((date, index) => {
                          const isSelected = selectedDate?.toDateString() === date.toDateString();
                          const dateStr = date.toISOString().split('T')[0];
                          const dayInfo = dateAvailability[dateStr];
                          const noAvailability = dayInfo && !dayInfo.hasAvailability;
                          return (
                            <button
                              key={index}
                              onClick={() => !noAvailability && setSelectedDate(date)}
                              disabled={noAvailability}
                              className={`flex flex-col items-center min-w-[52px] py-3 px-3 rounded-xl transition-all duration-300 ${
                                noAvailability
                                  ? "opacity-40 cursor-not-allowed"
                                  : isSelected
                                    ? "bg-violet-500 text-white shadow-lg shadow-violet-200 cursor-pointer"
                                    : "hover:bg-gray-100 active:scale-95 cursor-pointer"
                              }`}
                            >
                              <span className={`text-lg font-bold ${noAvailability ? "text-gray-300" : isSelected ? "text-white" : "text-gray-900"}`}>
                                {date.getDate()}
                              </span>
                              <span className={`text-xs uppercase font-medium ${noAvailability ? "text-gray-300" : isSelected ? "text-violet-100" : "text-gray-500"}`}>
                                {getDayName(date)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Time slots section with ref */}
                  <div ref={timeSlotsRef}>
                    {/* Error message - mobile only (inline) */}
                    {slotSelectionError && (
                      <div
                        className="lg:hidden mb-4 p-4 bg-white rounded-xl border border-red-200 shadow-lg animate-fadeIn"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                            <span className="text-lg">⚠️</span>
                          </div>
                          <div>
                            <p className="text-sm text-gray-900 font-semibold">
                              {slotSelectionError}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Будь ласка, оберіть час так, щоб {requiredSlots} слотів підряд були вільні
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Time slots */}
                    {!selectedDate ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Calendar className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">Оберіть дату щоб побачити доступний час</p>
                      </div>
                    ) : loadingSlots ? (
                      <div className="text-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 font-medium">Завантаження...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {timeSlots.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-500 font-medium">Немає доступних слотів</p>
                          </div>
                        ) : (
                          timeSlots.map((slot, slotIdx) => {
                            const isSelected = selectedTimes.includes(slot.time);
                            const isBooked = slot.booked;
                            // Check if N consecutive free slots exist starting from this one
                            let canStart = slot.available;
                            if (canStart && requiredSlots > 1) {
                              for (let k = 1; k < requiredSlots; k++) {
                                const next = timeSlots[slotIdx + k];
                                if (!next || !next.available) { canStart = false; break; }
                              }
                            }
                            const isDisabled = !slot.available || (!isSelected && !canStart);

                            return (
                              <button
                                key={slot.time}
                                onClick={() => canStart && handleTimeSlotClick(slot.time)}
                                disabled={isDisabled}
                                className={`w-full p-4 rounded-xl border-2 text-center font-medium transition-all duration-300 ease-out ${
                                  isBooked
                                    ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed line-through"
                                    : isSelected
                                      ? "border-gray-900 bg-gray-900 text-white shadow-lg cursor-pointer"
                                      : !canStart
                                        ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                                        : "border-gray-100 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
                                }`}
                              >
                                <span className="flex items-center justify-center gap-2">
                                  {slot.time}
                                  {isBooked && <span className="text-xs">(зайнято)</span>}
                                  {!isBooked && !canStart && <span className="text-xs">(недостатньо часу)</span>}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Confirmation form */}
              {currentStep === 3 && (
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Підтвердження</h1>

                  <div className="space-y-4">
                    {/* First name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ім'я *</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Введіть ваше ім'я"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all"
                      />
                    </div>

                    {/* Last name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Прізвище *</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Введіть ваше прізвище"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all"
                      />
                    </div>

                    {/* Phone with +380 prefix */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Номер телефону *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 py-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-600 font-medium text-base">
                          +380
                        </span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            // Only allow digits
                            const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                            // Format as XX XXX XX XX
                            let formatted = '';
                            if (digits.length > 0) formatted += digits.slice(0, 2);
                            if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
                            if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
                            if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);
                            setPhone(formatted);
                          }}
                          placeholder="12 345 67 89"
                          className="flex-1 px-4 py-3 rounded-r-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-base"
                        />
                      </div>
                    </div>

                    {/* Email (optional) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-gray-400 font-normal">(для підтвердження)</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none transition-all text-base"
                      />
                    </div>

                    {/* Booking summary */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">Деталі бронювання</h4>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Дата:</span>
                          <span className="font-medium text-gray-900">
                            {selectedDate?.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Час:</span>
                          <span className="font-medium text-gray-900">
                            {selectedTimes[0]} - {selectedTimes[selectedTimes.length - 1]}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Тривалість:</span>
                          <span className="font-medium text-gray-900">{roundedDuration} хв</span>
                        </div>
                        {selectedSpecialist && selectedSpecialist !== "any" && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Спеціаліст:</span>
                            <span className="font-medium text-gray-900">
                              {specialists.find(s => s.id === selectedSpecialist)?.name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-2">Послуги:</h5>
                        {selectedServiceItems.map(service => (
                          <div key={service.id} className="flex justify-between text-sm py-1">
                            <span className="text-gray-600">{service.name}</span>
                            <span className="font-medium text-gray-900">{service.price} ₴</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm pt-2 mt-2 border-t border-gray-200">
                          <span className="font-bold text-gray-900">Всього:</span>
                          <span className="font-bold text-gray-900">
                            {selectedServiceItems.reduce((sum, s) => sum + s.price, 0)} ₴
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Done */}
              {currentStep === 4 && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-green-100 flex items-center justify-center">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Бронювання підтверджено!</h1>
                  <p className="text-gray-500 mb-8">
                    {email ? 'Підтвердження надіслано на вашу пошту' : 'Чекаємо на вас!'}
                  </p>

                  {/* Booking details */}
                  <div className="max-w-sm mx-auto p-4 bg-gray-50 rounded-xl text-left mb-8">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Дата:</span>
                        <span className="font-medium text-gray-900">
                          {selectedDate?.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Час:</span>
                        <span className="font-medium text-gray-900">{selectedTimes[0]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Клієнт:</span>
                        <span className="font-medium text-gray-900">{firstName} {lastName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Telegram bot CTA */}
                  <div className="max-w-sm mx-auto p-5 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center">
                        <Send className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-gray-900">Telegram нагадування</h3>
                        <p className="text-sm text-gray-500">Отримуйте сповіщення про візити</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Якщо ви хочете отримувати нагадування про візити, активуйте нашого бота в Telegram
                    </p>
                    <a
                      href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT || 'tholim_bot'}?start=client_${bookedClientId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 no-underline"
                    >
                      <Send className="w-4 h-4" />
                      Підписатися в Telegram
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar - hidden on mobile */}
            <div className="w-[340px] shrink-0 hidden lg:flex lg:flex-col">
              <BookingSummary
                salonName={salonName}
                salonImage={salonImage}
                salonRating={salonRating}
                salonReviews={salonReviews}
                salonAddress={salonAddress}
                selectedServices={selectedServices}
                selectedSpecialist={selectedSpecialist}
                selectedDate={selectedDate}
                selectedTimes={selectedTimes}
                specialists={specialists}
                services={services}
                totalDurationMinutes={roundedDuration}
              />

              {/* Desktop button - aligned with sidebar */}
              {currentStep < steps.length - 1 && (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isSubmitting}
                  className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-12 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : currentStep === 3 ? "Підтвердити бронювання" : "Продовжити"}
                </Button>
              )}

              {/* Close button on Done step - desktop */}
              {currentStep === steps.length - 1 && (
                <Button
                  onClick={handleSmoothClose}
                  className="mt-4 w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-12 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 cursor-pointer"
                >
                  Закрити
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Footer - mobile/tablet only, hidden on desktop */}
        {currentStep < steps.length - 1 && (
          <div className="lg:hidden px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-12 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 cursor-pointer"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentStep === 3 ? "Підтвердити бронювання" : "Продовжити"}
            </Button>
          </div>
        )}

        {/* Close button on Done step - mobile/tablet only */}
        {currentStep === steps.length - 1 && (
          <div className="lg:hidden px-4 sm:px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
            <Button
              onClick={handleSmoothClose}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl px-8 h-12 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 cursor-pointer"
            >
              Закрити
            </Button>
          </div>
        )}
      </div>

      {/* Confirm close dialog */}
      <ConfirmCloseDialog
        isOpen={showConfirmClose}
        onCancel={() => setShowConfirmClose(false)}
        onConfirm={handleConfirmClose}
      />

      {/* Desktop toast notification - bottom right */}
      {slotSelectionError && currentStep === 2 && (
        <div
          className="hidden lg:block fixed bottom-6 right-6 z-[110] max-w-sm p-4 bg-white rounded-xl border border-red-200 shadow-2xl animate-slideUp"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
              <span className="text-lg">⚠️</span>
            </div>
            <div>
              <p className="text-sm text-gray-900 font-semibold">
                {slotSelectionError}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Будь ласка, оберіть час так, щоб {requiredSlots} слотів підряд були вільні
              </p>
            </div>
            <button
              onClick={() => setSlotSelectionError(null)}
              className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
