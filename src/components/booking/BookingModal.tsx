"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Star, Check, Plus, Calendar, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";

// Types
interface Service {
  id: string;
  name: string;
  duration: string;
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
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonImage: string;
  salonRating: number;
  salonReviews: number;
  salonAddress: string;
  services: { category: string; items: Service[] }[];
  specialists: Specialist[];
}

// Step indicator component
function StepIndicator({
  steps,
  currentStep
}: {
  steps: string[];
  currentStep: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <span className={`transition-colors ${index <= currentStep ? "text-gray-900 font-medium" : ""}`}>
            {step}
          </span>
          {index < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 mx-2 text-gray-300" />
          )}
        </div>
      ))}
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
  selectedTime,
  specialists,
  services,
}: {
  salonName: string;
  salonImage: string;
  salonRating: number;
  salonReviews: number;
  salonAddress: string;
  selectedServices: string[];
  selectedSpecialist: string | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  specialists: Specialist[];
  services: { category: string; items: Service[] }[];
}) {
  const allServices = services.flatMap(c => c.items);
  const selectedServiceItems = allServices.filter(s => selectedServices.includes(s.id));
  const specialist = specialists.find(s => s.id === selectedSpecialist);

  const total = selectedServiceItems.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServiceItems.reduce((sum, s) => {
    const match = s.duration.match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  const formatDate = (date: Date) => {
    const days = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"];
    const months = ["січня", "лютого", "березня", "квітня", "травня", "червня",
                    "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Salon info */}
      <div className="p-5 border-b border-gray-100">
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
              <span className="text-gray-500">({salonReviews.toLocaleString()})</span>
            </div>
            <p className="text-xs text-gray-500 truncate mt-0.5">{salonAddress}</p>
          </div>
        </div>
      </div>

      {/* Date & Time */}
      {selectedDate && selectedTime && (
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm mt-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {selectedTime} (тривалість {totalDuration > 60 ? `${Math.floor(totalDuration/60)} г ${totalDuration % 60} хв` : `${totalDuration} хв`})
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm modal-backdrop"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl modal-content">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors cursor-pointer"
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
              className="flex-1 px-4 py-3 rounded-full border border-gray-200 font-medium text-gray-900 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
            >
              Відмінити
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 rounded-full bg-gray-900 font-medium text-white hover:bg-gray-800 active:scale-95 transition-all cursor-pointer"
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
  salonName,
  salonImage,
  salonRating,
  salonReviews,
  salonAddress,
  services,
  specialists,
}: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const steps = ["Послуги", "Спеціаліст", "Час", "Підтвердження"];

  // Generate dates for calendar (next 14 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Generate time slots
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const morningTimes = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
    const afternoonTimes = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30"];
    const eveningTimes = ["16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00"];

    [...morningTimes, ...afternoonTimes, ...eveningTimes].forEach(time => {
      // Randomly mark some as unavailable for demo
      const available = Math.random() > 0.3;
      slots.push({ time, available });
    });
    return slots;
  };

  const dates = generateDates();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    if (selectedDate) {
      setTimeSlots(generateTimeSlots());
      setSelectedTime(null);
    }
  }, [selectedDate]);

  const getDayName = (date: Date) => {
    const days = ["нд", "пн", "вт", "ср", "чт", "пт", "сб"];
    return days[date.getDay()];
  };

  const getMonthName = (date: Date) => {
    const months = ["січень", "лютий", "березень", "квітень", "травень", "червень",
                    "липень", "серпень", "вересень", "жовтень", "листопад", "грудень"];
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
      case 2: return selectedDate !== null && selectedTime !== null;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentStep(0);
      setSelectedServices([]);
      setSelectedSpecialist(null);
      setSelectedDate(null);
      setSelectedTime(null);
      setShowAllServices(false);
      setShowConfirmClose(false);
    }
  }, [isOpen]);

  // Check if user has made any selections
  const hasSelections = selectedServices.length > 0 || selectedSpecialist !== null || selectedDate !== null;

  const handleCloseAttempt = () => {
    if (hasSelections) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmClose(false);
    onClose();
  };

  if (!isOpen) return null;

  const allServices = services.flatMap(c => c.items);
  const displayedServices = showAllServices ? allServices : allServices.slice(0, 5);

  return (
    <div className="fixed inset-0 z-[100] bg-white overflow-hidden fullpage-modal">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-gray-100 shrink-0">
          <button
            onClick={currentStep > 0 ? handleBack : handleCloseAttempt}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>

          <StepIndicator steps={steps} currentStep={currentStep} />

          <button
            onClick={handleCloseAttempt}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-6xl mx-auto px-6 py-8 flex gap-8">
            {/* Main content */}
            <div className="flex-1 overflow-y-auto pr-4">
              {/* Step 0: Services */}
              {currentStep === 0 && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">Оберіть послуги</h1>

                  <div className="space-y-3">
                    {displayedServices.map(service => {
                      const isSelected = selectedServices.includes(service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? "border-gray-900 bg-gray-50/50 shadow-sm"
                              : "border-gray-100 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">{service.name}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">{service.duration}</p>
                              <p className="text-sm font-medium text-gray-900 mt-1">
                                {service.priceFrom && <span className="text-gray-500 font-normal">від </span>}
                                {service.price} ₴
                              </p>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
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

                  {allServices.length > 5 && (
                    <button
                      onClick={() => setShowAllServices(!showAllServices)}
                      className="mt-6 text-gray-900 font-medium hover:underline flex items-center gap-1 cursor-pointer transition-colors hover:text-gray-600"
                    >
                      {showAllServices ? "Показати менше" : `Дивитись усі послуги (${allServices.length})`}
                      <ChevronRight className={`w-4 h-4 transition-transform ${showAllServices ? "rotate-90" : ""}`} />
                    </button>
                  )}
                </div>
              )}

              {/* Step 1: Specialist */}
              {currentStep === 1 && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">Оберіть спеціаліста</h1>

                  {/* Any specialist option */}
                  <div
                    onClick={() => setSelectedSpecialist("any")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md mb-3 ${
                      selectedSpecialist === "any"
                        ? "border-gray-900 bg-gray-50/50 shadow-sm"
                        : "border-gray-100 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Будь-який спеціаліст</h3>
                          <p className="text-sm text-gray-500">для гнучкого бронювання</p>
                        </div>
                      </div>
                      {selectedSpecialist === "any" ? (
                        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center scale-110 transition-transform">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <Button variant="outline" className="rounded-full hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
                          Обрати
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Specialists list */}
                  <div className="space-y-3">
                    {specialists.map(specialist => {
                      const isSelected = selectedSpecialist === specialist.id;
                      return (
                        <div
                          key={specialist.id}
                          onClick={() => setSelectedSpecialist(specialist.id)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? "border-gray-900 bg-gray-50/50 shadow-sm"
                              : "border-gray-100 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 ring-2 ring-white shadow-md">
                                  <Image
                                    src={specialist.avatar}
                                    alt={specialist.name}
                                    width={56}
                                    height={56}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full px-1.5 py-0.5 shadow-sm flex items-center gap-0.5 border border-gray-100">
                                  <span className="text-xs font-bold text-gray-900">{specialist.rating}</span>
                                  <Star className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                                </div>
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900">{specialist.name}</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">{specialist.role}</p>
                                <p className="text-sm font-medium text-gray-900 mt-0.5">від {specialist.price} ₴</p>
                              </div>
                            </div>
                            {isSelected ? (
                              <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center scale-110 transition-transform">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            ) : (
                              <Button variant="outline" className="rounded-full hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
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

              {/* Step 2: Time - Fresha style */}
              {currentStep === 2 && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">Виберіть час</h1>

                  {/* Specialist chip */}
                  {selectedSpecialist && selectedSpecialist !== "any" && (
                    <div className="flex items-center gap-2 mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 cursor-pointer hover:bg-gray-200 transition-colors">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200">
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
                        <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                      </div>
                      <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
                        <Calendar className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  )}

                  {/* Month header */}
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-gray-700">
                      {getMonthName(dates[0])} {dates[0].getFullYear()} р.
                    </h2>
                    <div className="flex gap-1">
                      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-all cursor-pointer">
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontal date selector - Fresha style */}
                  <div className="flex gap-2 mb-8 pb-2 overflow-x-auto scrollbar-hide">
                    {dates.slice(0, 7).map((date, index) => {
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      const isToday = new Date().toDateString() === date.toDateString();
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(date)}
                          className={`flex flex-col items-center min-w-[52px] py-3 px-3 rounded-full transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? "bg-violet-500 text-white shadow-lg shadow-violet-200 scale-105"
                              : "hover:bg-gray-100 active:scale-95"
                          }`}
                        >
                          <span className={`text-lg font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                            {date.getDate()}
                          </span>
                          <span className={`text-xs uppercase font-medium ${isSelected ? "text-violet-100" : "text-gray-500"}`}>
                            {getDayName(date)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  {!selectedDate ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">Оберіть дату щоб побачити доступний час</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {timeSlots.filter(s => s.available).length === 0 ? (
                        <div className="text-center py-12">
                          <p className="text-gray-500 font-medium">На цю дату немає вільних слотів</p>
                          <p className="text-sm text-gray-400 mt-1">Спробуйте обрати іншу дату</p>
                        </div>
                      ) : (
                        timeSlots.filter(s => s.available).map(slot => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`w-full p-4 rounded-xl border-2 text-center font-medium transition-all duration-200 cursor-pointer ${
                                isSelected
                                  ? "border-gray-900 bg-gray-900 text-white shadow-lg"
                                  : "border-gray-100 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                              }`}
                            >
                              {slot.time}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Confirmation */}
              {currentStep === 3 && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-6">Підтвердження</h1>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-200">
                        <Check className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">Майже готово!</h3>
                        <p className="text-sm text-gray-600">Перевірте деталі та підтвердіть бронювання</p>
                      </div>
                    </div>
                  </div>

                  {/* Booking details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Calendar className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {selectedDate?.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <p className="text-sm text-gray-500">{selectedTime}</p>
                      </div>
                    </div>

                    {selectedSpecialist && selectedSpecialist !== "any" && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 shadow-sm">
                          <Image
                            src={specialists.find(s => s.id === selectedSpecialist)?.avatar || ""}
                            alt=""
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {specialists.find(s => s.id === selectedSpecialist)?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {specialists.find(s => s.id === selectedSpecialist)?.role}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Services summary */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <h4 className="font-semibold text-gray-900 mb-3">Обрані послуги</h4>
                      <div className="space-y-2">
                        {allServices.filter(s => selectedServices.includes(s.id)).map(service => (
                          <div key={service.id} className="flex justify-between text-sm">
                            <span className="text-gray-600">{service.name}</span>
                            <span className="font-medium text-gray-900">{service.price} ₴</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-[340px] shrink-0 hidden lg:block">
              <BookingSummary
                salonName={salonName}
                salonImage={salonImage}
                salonRating={salonRating}
                salonReviews={salonReviews}
                salonAddress={salonAddress}
                selectedServices={selectedServices}
                selectedSpecialist={selectedSpecialist}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                specialists={specialists}
                services={services}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0 bg-white">
          <div className="max-w-6xl mx-auto flex justify-end">
            <Button
              onClick={currentStep === 3 ? onClose : handleNext}
              disabled={!canProceed()}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-8 h-12 font-semibold transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:active:scale-100 cursor-pointer"
            >
              {currentStep === 3 ? "Підтвердити бронювання" : "Продовжити"}
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm close dialog */}
      <ConfirmCloseDialog
        isOpen={showConfirmClose}
        onCancel={() => setShowConfirmClose(false)}
        onConfirm={handleConfirmClose}
      />
    </div>
  );
}
