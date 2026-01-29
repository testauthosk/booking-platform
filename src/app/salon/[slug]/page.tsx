"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Zap,
  Check,
  Navigation,
  X,
  ChevronLeft,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/booking/BookingModal";

// Mock data - will be replaced with real data from API
const salonData = {
  name: "MENSPIRE Beethoven",
  slug: "menspire-beethoven",
  type: "Перукарня",
  rating: 5.0,
  reviewCount: 1489,
  isOpen: false,
  opensAt: "четвер о 10:00",
  address: "Beethovenstraat 53, Amsterdam-zuid, Amsterdam, Noord-Holland",
  shortAddress: "Beethovenstraat 53, Amsterdam",
  phone: "+31 20 123 4567",
  description: "Award Winning Mens Mops Grooming. MENSPIRE presents the revolutionary transition between precision barbering and contemporary hairdressing. A fusion of technical and artistic skills with a commitment to bridge the gap between the traditional barbershop and the modern hair business.",
  photos: [
    "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=1200&h=800&fit=crop",
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=800&h=600&fit=crop",
  ],
  coordinates: {
    lat: 52.3438,
    lng: 4.8722,
  },
  workingHours: [
    { day: "Понеділок", hours: "Зачинено", isToday: false },
    { day: "Вівторок", hours: "10:00 - 20:00", isToday: false },
    { day: "Середа", hours: "10:00 - 20:00", isToday: true },
    { day: "Четвер", hours: "10:00 - 20:00", isToday: false },
    { day: "П'ятниця", hours: "10:00 - 20:00", isToday: false },
    { day: "Субота", hours: "09:00 - 18:00", isToday: false },
    { day: "Неділя", hours: "09:00 - 17:00", isToday: false },
  ],
  amenities: [
    "Миттєве підтвердження",
    "Оплата на місці",
  ],
};

const services = [
  {
    id: "1",
    category: "СТРИЖКА",
    items: [
      { id: "1-1", name: "Стрижка чоловіча", duration: "35 хв", durationMinutes: 35, price: 450, priceFrom: true },
      { id: "1-2", name: "Стрижка + борода", duration: "45 хв+", durationMinutes: 45, price: 650, priceFrom: true },
      { id: "1-3", name: "Стрижка + борода + гарячий рушник", duration: "1г 15 хв", durationMinutes: 75, price: 700, priceFrom: true },
    ],
  },
  {
    id: "2",
    category: "БОРОДА",
    items: [
      { id: "2-1", name: "Корекція бороди", duration: "20 хв", durationMinutes: 20, price: 250, priceFrom: true },
      { id: "2-2", name: "Корекція бороди + гоління", duration: "30 хв", durationMinutes: 30, price: 350, priceFrom: false },
    ],
  },
  {
    id: "3",
    category: "ГОЛІННЯ",
    items: [
      { id: "3-1", name: "Гоління голови", duration: "25 хв", durationMinutes: 25, price: 350, priceFrom: false },
    ],
  },
];

const team = [
  { id: "1", name: "ТЕНЗІН", role: "Стиліст", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", rating: 5.0, reviewCount: 245, price: 450 },
  { id: "2", name: "ЛОРЕНЦО", role: "Старший стиліст", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop", rating: 4.9, reviewCount: 312, price: 500 },
  { id: "3", name: "АРМАЛЬДО", role: "Старший стиліст", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop", rating: 4.9, reviewCount: 189, price: 500 },
  { id: "4", name: "КРІСТІАН", role: "Старший стиліст", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop", rating: 5.0, reviewCount: 421, price: 500 },
  { id: "5", name: "ХАРЛІ", role: "Креативний директор", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop", rating: 5.0, reviewCount: 567, price: 600 },
  { id: "6", name: "МІЛОШ", role: "Креативний директор", avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop", rating: 4.8, reviewCount: 234, price: 600 },
];

const reviews = [
  { id: "1", author: "Томас В", initial: "Т", color: "bg-blue-500", date: "26 лип 2024", rating: 5, text: "Завжди на висоті 🙌", service: "Стрижка чоловіча" },
  { id: "2", author: "Герман В", initial: "Г", color: "bg-green-500", date: "17 лип 2024", rating: 5, text: "Чудово", service: "Корекція бороди" },
  { id: "3", author: "Буріт Т", initial: "Б", color: "bg-purple-500", date: "21 лип 2024", rating: 5, text: "Топ!", service: "Стрижка чоловіча" },
  { id: "4", author: "Маріо С", initial: "М", color: "bg-orange-500", date: "14 лип 2024", rating: 5, text: "Мілош - найкращий ❤️", service: "Стрижка + борода" },
];

// Gallery Modal Component with fullscreen view and swipe
function GalleryModal({
  isOpen,
  onClose,
  photos,
  initialIndex = 0
}: {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Smooth close with animation
  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setFullscreenMode(false);
      onClose();
    }, 300);
  };

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const goNext = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const goPrev = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setTimeout(() => setIsTransitioning(false), 500);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning || touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    // Visual feedback during drag
    const diff = currentX - touchStart;
    setSwipeOffset(diff * 0.4);
  };

  const onTouchEnd = () => {
    if (isTransitioning || !touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }
    const distance = touchStart - touchEnd;
    setSwipeOffset(0);

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        goNext();
      } else {
        goPrev();
      }
    }
  };

  const openFullscreen = (index: number) => {
    setCurrentIndex(index);
    setFullscreenMode(true);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  if (!isOpen) return null;

  // Fullscreen image viewer
  if (fullscreenMode) {
    return (
      <div
        className={`fixed inset-0 z-[100] bg-black flex items-center justify-center ${isClosing ? 'animate-fadeOut' : 'fullpage-modal'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={() => setFullscreenMode(false)}
          className="absolute top-4 right-4 z-20 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Counter */}
        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>

        {/* Previous button */}
        <button
          onClick={goPrev}
          className="absolute left-4 z-20 w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* Main image with smooth transition */}
        <div
          className="relative w-full h-full flex items-center justify-center p-4 transition-transform duration-500 ease-out"
          style={{
            transform: `translateX(${swipeOffset}px)`,
          }}
        >
          <Image
            src={photos[currentIndex]}
            alt={`Фото ${currentIndex + 1}`}
            fill
            className="object-contain transition-opacity duration-500 ease-out"
            priority
          />
        </div>

        {/* Next button */}
        <button
          onClick={goNext}
          className="absolute right-4 z-20 w-14 h-14 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        {/* Thumbnail strip at bottom */}
        <div className="absolute bottom-4 left-0 right-0 z-20">
          <div className="flex justify-center gap-2 px-4 overflow-x-auto scrollbar-hide">
            {photos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 transition-all cursor-pointer ${
                  index === currentIndex ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={photo}
                  alt={`Міні ${index + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Gallery grid view
  return (
    <div className={`fixed inset-0 z-[100] bg-white ${isClosing ? 'animate-fadeOut' : 'fullpage-modal'}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Галерея зображень</h2>
            <p className="text-xs sm:text-sm text-gray-500">{salonData.name}</p>
          </div>
          <button
            onClick={handleSmoothClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="pt-16 sm:pt-20 pb-8 px-4 sm:px-6 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Main large image - clickable */}
          <div
            onClick={() => openFullscreen(0)}
            className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4 cursor-pointer group"
          >
            <Image
              src={photos[0]}
              alt="Головне фото"
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full px-4 py-2 text-sm font-medium text-gray-900">
                Відкрити
              </div>
            </div>
          </div>

          {/* Grid of smaller images - clickable */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {photos.slice(1).map((photo, index) => (
              <div
                key={index}
                onClick={() => openFullscreen(index + 1)}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
              >
                <Image
                  src={photo}
                  alt={`Фото ${index + 2}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const tabs = [
  { id: "services", label: "Послуги" },
  { id: "team", label: "Команда" },
  { id: "reviews", label: "Відгуки" },
  { id: "about", label: "Загальні відомості" },
];

export default function SalonPage() {
  const [activeTab, setActiveTab] = useState("services");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Refs and state for animated tab underline
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Swipe handlers for mobile gallery with smooth animation
  const minSwipeDistance = 50;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning || touchStart === null) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    // Calculate offset for visual feedback during drag
    const diff = currentX - touchStart;
    setSwipeOffset(diff * 0.3); // Reduced for subtle effect
  };
  const onTouchEnd = () => {
    if (isTransitioning || !touchStart || !touchEnd) {
      setSwipeOffset(0);
      return;
    }
    const distance = touchStart - touchEnd;
    setSwipeOffset(0);

    if (Math.abs(distance) > minSwipeDistance) {
      setIsTransitioning(true);
      if (distance > 0) {
        setMobilePhotoIndex(prev => (prev + 1) % salonData.photos.length);
      } else {
        setMobilePhotoIndex(prev => (prev - 1 + salonData.photos.length) % salonData.photos.length);
      }
      // Reset transition state after animation
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  // Smooth scroll to top on page load/refresh
  useEffect(() => {
    if (window.scrollY > 0) {
      const startPosition = window.scrollY;
      const duration = 600;
      let startTime: number | null = null;

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        window.scrollTo(0, startPosition * (1 - easedProgress));

        if (timeElapsed < duration) {
          requestAnimationFrame(animation);
        }
      };

      requestAnimationFrame(animation);
    }
  }, []);

  // Scroll to reviews - smooth and slow
  const scrollToReviews = () => {
    setActiveTab("reviews");
    setTimeout(() => {
      // Custom smooth scroll with easing
      const element = reviewsRef.current;
      if (element) {
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 800; // Longer duration for smoother feel
        let startTime: number | null = null;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

        const animation = (currentTime: number) => {
          if (startTime === null) startTime = currentTime;
          const timeElapsed = currentTime - startTime;
          const progress = Math.min(timeElapsed / duration, 1);
          const easedProgress = easeOutCubic(progress);

          window.scrollTo(0, startPosition + distance * easedProgress);

          if (timeElapsed < duration) {
            requestAnimationFrame(animation);
          }
        };

        requestAnimationFrame(animation);
      }
    }, 150);
  };

  // Update underline position when active tab changes
  useLayoutEffect(() => {
    const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
    const activeTabEl = tabsRef.current[activeIndex];
    if (activeTabEl) {
      setUnderlineStyle({
        left: activeTabEl.offsetLeft,
        width: activeTabEl.offsetWidth,
      });
    }
  }, [activeTab]);

  // Track scroll for sidebar animation - triggers when name/rating header is scrolled past
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 120);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openGallery = (index: number = 0) => {
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Simplified for business card */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo - no link for demo */}
            <div className="flex items-center">
              <span className="text-2xl font-bold tracking-tight text-gray-900">booking</span>
            </div>

            {/* Right Actions - Hidden for now */}
            <div className="flex items-center gap-3">
              {/* Will be enabled later for marketplace */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - pb-24 for mobile bottom bar */}
      <main className="pb-24 lg:pb-0">
        {/* Hero Section - Name, Rating, Share ABOVE Gallery */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                {/* Salon Name - 44px like Fresha */}
                <h1 className="text-[32px] lg:text-[44px] font-bold text-gray-900 mb-3 leading-tight">
                  {salonData.name}
                </h1>

                {/* Rating & Info Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base">
                  {/* Rating */}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="w-5 h-5 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900 text-lg">{salonData.rating}</span>
                    <button
                      onClick={scrollToReviews}
                      className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                    >
                      ({salonData.reviewCount.toLocaleString()} відгуків)
                    </button>
                  </div>

                  <span className="text-gray-300 text-lg">•</span>

                  {/* Type */}
                  <span className="text-gray-600">{salonData.type}</span>

                  <span className="text-gray-300 text-lg">•</span>

                  {/* Status */}
                  <div className="flex items-center gap-1.5">
                    {salonData.isOpen ? (
                      <span className="text-green-600 font-medium">Відчинено</span>
                    ) : (
                      <>
                        <span className="text-red-500 font-medium">Зачинено</span>
                        <span className="text-gray-500">— відчиниться о {salonData.opensAt.replace('четвер о ', '')}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Share Button - aligned with rating row */}
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: salonData.name,
                      text: `${salonData.name} - ${salonData.type}`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer active:scale-95 self-end mb-0.5"
              >
                <Upload className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">Поділитися</span>
              </button>
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="bg-white">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Mobile Swipeable Gallery */}
            <div className="lg:hidden">
              <div
                className="relative h-[300px] rounded-xl overflow-hidden bg-gray-100"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={() => openGallery(mobilePhotoIndex)}
              >
                <div
                  className="absolute inset-0 transition-all duration-500 ease-out"
                  style={{
                    transform: `translateX(${swipeOffset}px)`,
                  }}
                >
                  <Image
                    src={salonData.photos[mobilePhotoIndex]}
                    alt={salonData.name}
                    fill
                    className="object-cover transition-all duration-500 ease-out"
                    priority
                  />
                </div>
                {/* Dot indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {salonData.photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMobilePhotoIndex(index);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === mobilePhotoIndex ? "bg-white w-6" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                {/* Counter */}
                <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                  {mobilePhotoIndex + 1} / {salonData.photos.length}
                </div>
                {/* View all button */}
                <button
                  className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGallery(0);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Усі фото
                </button>
              </div>
            </div>

            {/* Desktop Gallery - Fresha Style: 1 large + 2 small stacked */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_0.4fr] gap-2 h-[420px]">
              {/* Large Image */}
              <div
                className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                onClick={() => openGallery(0)}
              >
                <Image
                  src={salonData.photos[0]}
                  alt={salonData.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  priority
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                <button
                  className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-gray-900 px-4 py-2.5 rounded-full text-sm font-medium hover:bg-white transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    openGallery(0);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Дивитись усі
                </button>
              </div>

              {/* Small Images Stack */}
              <div className="grid grid-rows-2 gap-2">
                <div
                  className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                  onClick={() => openGallery(1)}
                >
                  <Image
                    src={salonData.photos[1]}
                    alt={`${salonData.name} інтер'єр`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
                <div
                  className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                  onClick={() => openGallery(2)}
                >
                  <Image
                    src={salonData.photos[2]}
                    alt={`${salonData.name} деталі`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10">
            {/* Left Column - Main Content */}
            <div>
              {/* Address Row - Below Gallery */}
              <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{salonData.shortAddress}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${salonData.coordinates.lat},${salonData.coordinates.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-all duration-200 cursor-pointer active:scale-95"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Прокласти маршрут
                </a>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-gray-200 mb-8">
                <nav className="flex gap-8 relative">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      ref={(el) => { tabsRef.current[index] = el; }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-4 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === tab.id
                          ? "text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  {/* Animated underline */}
                  <div
                    className="absolute bottom-0 h-0.5 bg-gray-900 transition-all duration-300 ease-out"
                    style={{
                      left: underlineStyle.left,
                      width: underlineStyle.width,
                    }}
                  />
                </nav>
              </div>

              {/* Services Section */}
              {activeTab === "services" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Послуги</h2>

                  <div className="space-y-8">
                    {services.map((category) => (
                      <div key={category.id}>
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                          {category.category}
                        </h3>
                        <div className="space-y-3">
                          {category.items.map((service) => (
                            <div
                              key={service.id}
                              onClick={() => setBookingOpen(true)}
                              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer group"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-gray-900 mb-1">
                                    {service.name}
                                  </h4>
                                  <p className="text-sm text-gray-500 mb-2">
                                    {service.duration}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {service.priceFrom && <span className="text-gray-500 font-normal">від </span>}
                                    {service.price} ₴
                                  </p>
                                </div>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBookingOpen(true);
                                  }}
                                  className="bg-gray-900 hover:bg-gray-800 active:scale-95 text-white rounded-full px-6 h-10 font-medium shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer"
                                >
                                  Забронювати
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setBookingOpen(true)}
                    className="mt-6 text-gray-900 font-medium hover:underline flex items-center gap-1 cursor-pointer transition-colors hover:text-gray-600"
                  >
                    Дивитись усі послуги
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </section>
              )}

              {/* Team Section */}
              {activeTab === "team" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Команда</h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {team.map((member) => (
                      <div
                        key={member.id}
                        className="group cursor-pointer"
                      >
                        <div className="relative mb-3">
                          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
                            <Image
                              src={member.avatar}
                              alt={member.name}
                              width={200}
                              height={200}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          {/* Rating Badge */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-full px-2.5 py-1 shadow-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold text-gray-900">{member.rating}</span>
                          </div>
                        </div>
                        <div className="text-center pt-2">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {member.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Reviews Section */}
              {activeTab === "reviews" && (
                <section ref={reviewsRef} className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Відгуки</h2>

                  {/* Rating Summary - Compact like Fresha */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className="w-6 h-6 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <span className="text-lg font-semibold text-gray-900">{salonData.rating.toFixed(1).replace('.', ',')}</span>
                    <span className="text-blue-600">({salonData.reviewCount.toLocaleString().replace(',', ' ')} відгуків)</span>
                  </div>

                  {/* Reviews Grid - 2 columns like Fresha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-5">
                        {/* Author row */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-full ${review.color} flex items-center justify-center text-white font-semibold text-sm`}>
                            {review.initial}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                              {review.author}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {review.date}
                            </span>
                          </div>
                        </div>
                        {/* Stars */}
                        <div className="flex mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className="w-4 h-4 fill-yellow-400 text-yellow-400"
                            />
                          ))}
                        </div>
                        {/* Review text */}
                        <p className="text-sm text-gray-700">{review.text}</p>
                      </div>
                    ))}
                  </div>

                  <button className="mt-6 px-6 py-2.5 border border-gray-200 rounded-full text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer">
                    Посмотреть все
                  </button>
                </section>
              )}

              {/* About Section */}
              {activeTab === "about" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Загальні відомості</h2>

                  <p className="text-gray-600 leading-relaxed mb-8">
                    {salonData.description}
                  </p>

                  {/* Map */}
                  <div className="rounded-2xl overflow-hidden mb-6 border border-gray-100">
                    <div className="aspect-[16/9] bg-gray-100 relative">
                      <iframe
                        src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2437.3!2d${salonData.coordinates.lng}!3d${salonData.coordinates.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTLCsDIwJzM3LjciTiA0wrA1MicyMC4wIkU!5e0!3m2!1sen!2s!4v1234567890`}
                        className="w-full h-full border-0"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 mb-6">
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900 font-medium">{salonData.address}</p>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${salonData.coordinates.lat},${salonData.coordinates.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Прокласти маршрут →
                      </a>
                    </div>
                  </div>

                  {/* Working Hours - Fresha style */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      Час роботи
                    </h3>
                    <div className="space-y-4">
                      {salonData.workingHours.map((item) => (
                        <div
                          key={item.day}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-1">
                            <span className={`text-sm ${item.isToday ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                              {item.day}
                            </span>
                            {item.isToday && (
                              <span className="text-sm text-green-600 font-medium">(сьогодні)</span>
                            )}
                          </div>
                          <span className={`text-sm ${item.hours === "Зачинено" ? "text-gray-400" : item.isToday ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                            {item.hours}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-4">Додаткова інформація</h3>
                    <div className="space-y-3">
                      {salonData.amenities.map((amenity, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center">
                            <Check className="w-3 h-3 text-gray-600" />
                          </div>
                          <span className="text-gray-600">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column - Sticky Sidebar Fresha Style */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                {/* Main Booking Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  {/* Header - shows name/rating when scrolled (Fresha style) */}
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${
                    isScrolled ? "max-h-[160px] opacity-100" : "max-h-0 opacity-0"
                  }`}>
                    <div className="px-5 pt-5 space-y-2 pb-[22px] border-b border-gray-200">
                      {/* Name - 44px bold like Fresha */}
                      <h3 className="font-bold text-gray-900 text-[28px] leading-tight">{salonData.name}</h3>

                      {/* Rating row - Fresha style: 5,0 + stars + (count) */}
                      <div className="flex items-center gap-2 pb-[38px]">
                        <span className="font-semibold text-gray-900 text-lg">{salonData.rating.toFixed(1).replace('.', ',')}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star key={star} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <button onClick={scrollToReviews} className="text-blue-600 font-medium text-base hover:underline cursor-pointer">
                          ({salonData.reviewCount.toLocaleString().replace(',', ' ')} відгуків)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Booking Button */}
                  <div className={`px-5 transition-all duration-300 ${isScrolled ? "pt-4" : "pt-5"}`}>
                    <Button
                      onClick={() => setBookingOpen(true)}
                      className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white rounded-xl h-12 text-base font-semibold transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      Забронювати
                    </Button>
                  </div>

                  {/* Info Section */}
                  <div className="p-5 space-y-3">
                    {/* Status with expandable schedule */}
                    <div>
                      <button
                        onClick={() => setScheduleOpen(!scheduleOpen)}
                        className="flex items-center gap-3 w-full text-left cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          salonData.isOpen ? "bg-green-50" : "bg-red-50"
                        }`}>
                          <Clock className={`w-5 h-5 ${
                            salonData.isOpen ? "text-green-600" : "text-red-500"
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`font-medium ${salonData.isOpen ? "text-green-600" : "text-red-500"}`}>
                              {salonData.isOpen ? "Відчинено" : "Зачинено"}
                            </span>
                            <span className="text-gray-600">
                              {salonData.isOpen ? `до 20:00` : `о ${salonData.opensAt.replace('четвер о ', '')}`}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${scheduleOpen ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                      </button>

                      {/* Expandable schedule */}
                      <div className={`overflow-hidden transition-all duration-300 ease-out ${
                        scheduleOpen ? "max-h-[300px] opacity-100 mt-3" : "max-h-0 opacity-0"
                      }`}>
                        <div className="pl-[52px] space-y-2">
                          {salonData.workingHours.map((item) => (
                            <div
                              key={item.day}
                              className={`flex items-center gap-3 text-sm ${item.isToday ? "font-medium" : ""}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${
                                item.hours === "Зачинено" ? "bg-gray-300" : "bg-green-500"
                              }`} />
                              <span className={`flex-1 ${item.isToday ? "text-gray-900" : "text-gray-600"}`}>
                                {item.day}
                              </span>
                              <span className={`${item.isToday ? "text-gray-900 font-semibold" : item.hours === "Зачинено" ? "text-gray-400" : "text-gray-600"}`}>
                                {item.hours}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {salonData.address}
                        </p>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${salonData.coordinates.lat},${salonData.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 font-medium text-sm hover:underline inline-flex items-center gap-1 mt-1.5 transition-colors"
                        >
                          Прокласти маршрут
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <Button
          onClick={() => setBookingOpen(true)}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full h-12 text-base font-semibold"
        >
          Забронювати
        </Button>
      </div>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={salonData.photos}
        initialIndex={galleryIndex}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        salonName={salonData.name}
        salonImage={salonData.photos[0]}
        salonRating={salonData.rating}
        salonReviews={salonData.reviewCount}
        salonAddress={salonData.shortAddress}
        services={services.map(cat => ({
          category: cat.category,
          items: cat.items.map(item => ({
            id: item.id,
            name: item.name,
            duration: item.duration,
            durationMinutes: item.durationMinutes,
            price: item.price,
          }))
        }))}
        specialists={team.map(member => ({
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          rating: member.rating,
          reviewCount: member.reviewCount,
          price: member.price,
        }))}
      />
    </div>
  );
}
