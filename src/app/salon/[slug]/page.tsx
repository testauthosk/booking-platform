// @ts-nocheck
"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Star,
  MapPin,
  Clock,
  ChevronRight,
  Check,
  Navigation,
  X,
  ChevronLeft,
  Upload,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/booking/BookingModal";
import { getSalonBySlug } from "@/lib/api";
import type { SalonWithRelations } from "@/types/database";

// Gallery Modal Component
function GalleryModal({
  isOpen,
  onClose,
  photos,
  initialIndex = 0,
  salonName,
}: {
  isOpen: boolean;
  onClose: () => void;
  photos: string[];
  initialIndex?: number;
  salonName: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fullscreenMode, setFullscreenMode] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setFullscreenMode(false);
      onClose();
    }, 300);
  };

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

  if (fullscreenMode) {
    return (
      <div
        className={`fixed inset-0 z-[100] bg-black flex items-center justify-center ${isClosing ? 'animate-fadeOut' : 'fullpage-modal'}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <button
          onClick={() => setFullscreenMode(false)}
          className="absolute top-4 right-4 z-20 w-12 h-12 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-xl bg-black/50 text-white text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </div>

        <button
          onClick={goPrev}
          className="absolute left-4 z-20 w-14 h-14 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        <div
          className="relative w-full h-full flex items-center justify-center p-4 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${swipeOffset}px)` }}
        >
          <Image
            src={photos[currentIndex]}
            alt={`Фото ${currentIndex + 1}`}
            fill
            className="object-contain transition-opacity duration-500 ease-out"
            priority
          />
        </div>

        <button
          onClick={goNext}
          className="absolute right-4 z-20 w-14 h-14 rounded-xl bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

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
                <Image src={photo} alt={`Міні ${index + 1}`} width={64} height={64} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[100] bg-white ${isClosing ? 'animate-fadeOut' : 'fullpage-modal'}`}>
      <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Галерея зображень</h2>
            <p className="text-xs sm:text-sm text-gray-500">{salonName}</p>
          </div>
          <button
            onClick={handleSmoothClose}
            className="w-10 h-10 rounded-xl hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="pt-16 sm:pt-20 pb-8 px-4 sm:px-6 h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div
            onClick={() => openFullscreen(0)}
            className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4 cursor-pointer group"
          >
            <Image src={photos[0]} alt="Головне фото" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-xl px-4 py-2 text-sm font-medium text-gray-900">
                Відкрити
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {photos.slice(1).map((photo, index) => (
              <div
                key={index}
                onClick={() => openFullscreen(index + 1)}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
              >
                <Image src={photo} alt={`Фото ${index + 2}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
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

// Loading component
function LoadingState() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Завантаження...</p>
      </div>
    </div>
  );
}

// Not found component
function NotFoundState() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Салон не знайдено</h1>
        <p className="text-gray-500">Перевірте правильність посилання</p>
      </div>
    </div>
  );
}

export default function SalonPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [salon, setSalon] = useState<SalonWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("services");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingInitialCategory, setBookingInitialCategory] = useState<string | undefined>(undefined);
  const [bookingPreSelectedServiceId, setBookingPreSelectedServiceId] = useState<string | undefined>(undefined);
  const [isScrolled, setIsScrolled] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [mobilePhotoIndex, setMobilePhotoIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const reviewsRef = useRef<HTMLDivElement>(null);

  // Enable normal scrolling for public salon page
  useEffect(() => {
    document.documentElement.classList.add('salon-public');
    return () => { document.documentElement.classList.remove('salon-public'); };
  }, []);

  // Load salon data
  useEffect(() => {
    async function loadSalon() {
      setLoading(true);
      const data = await getSalonBySlug(slug);
      setSalon(data);
      setLoading(false);
    }
    if (slug) {
      loadSalon();
    }
  }, [slug]);

  // Get current day working hours
  const getCurrentDayInfo = () => {
    if (!salon?.working_hours) return { isOpen: false, opensAt: '' };
    const dayOfWeek = new Date().getDay();
    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    const today = salon.working_hours.find((h: any) => h.day === dayNames[dayOfWeek]);

    if (!today || today.hours === 'Зачинено') {
      // Find next open day
      for (let i = 1; i <= 7; i++) {
        const nextDay = (dayOfWeek + i) % 7;
        const nextDayHours = salon.working_hours.find((h: any) => h.day === dayNames[nextDay]);
        if (nextDayHours && nextDayHours.hours !== 'Зачинено') {
          const openTime = nextDayHours.hours.split(' - ')[0];
          return { isOpen: false, opensAt: `${dayNames[nextDay].toLowerCase()} о ${openTime}` };
        }
      }
      return { isOpen: false, opensAt: '' };
    }

    const [openTime, closeTime] = today.hours.split(' - ');
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    if (currentTime >= openTime && currentTime < closeTime) {
      return { isOpen: true, opensAt: closeTime };
    }

    return { isOpen: false, opensAt: openTime };
  };

  const { isOpen, opensAt } = salon ? getCurrentDayInfo() : { isOpen: false, opensAt: '' };

  // Mobile swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isTransitioning || touchStart === null || !salon) return;
    const currentX = e.targetTouches[0].clientX;
    setTouchEnd(currentX);
    const diff = currentX - touchStart;
    setSwipeOffset(diff * 0.3);
  };

  const onTouchEnd = () => {
    if (isTransitioning || !touchStart || !touchEnd || !salon) {
      setSwipeOffset(0);
      return;
    }
    const distance = touchStart - touchEnd;
    setSwipeOffset(0);

    if (Math.abs(distance) > minSwipeDistance) {
      setIsTransitioning(true);
      const photos = salon.photos || [];
      if (distance > 0) {
        setMobilePhotoIndex(prev => (prev + 1) % photos.length);
      } else {
        setMobilePhotoIndex(prev => (prev - 1 + photos.length) % photos.length);
      }
      setTimeout(() => setIsTransitioning(false), 500);
    }
  };

  // Scroll to reviews
  const scrollToReviews = () => {
    setActiveTab("reviews");
    setTimeout(() => {
      const element = reviewsRef.current;
      if (element) {
        const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - 100;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        const duration = 800;
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

  // Update underline position
  useLayoutEffect(() => {
    const update = () => {
      const activeIndex = tabs.findIndex(tab => tab.id === activeTab);
      const activeTabEl = tabsRef.current[activeIndex];
      if (activeTabEl && activeTabEl.offsetWidth > 0) {
        setUnderlineStyle({
          left: activeTabEl.offsetLeft,
          width: activeTabEl.offsetWidth,
        });
      }
    };
    update();
    // Retry after a frame in case refs aren't measured yet on mount
    const raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [activeTab]);

  // Track scroll
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

  const openBooking = (opts?: { category?: string; serviceId?: string }) => {
    setBookingInitialCategory(opts?.category);
    setBookingPreSelectedServiceId(opts?.serviceId);
    setBookingOpen(true);
  };

  // Loading and error states
  if (loading) return <LoadingState />;
  if (!salon) return <NotFoundState />;

  // Prepare data
  const photos = salon.photos && salon.photos.length > 0
    ? salon.photos
    : ['https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&h=600&fit=crop'];

  const workingHoursWithToday = (salon.working_hours || []).map((item: any) => {
    const dayOfWeek = new Date().getDay();
    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    return {
      ...item,
      isToday: item.day === dayNames[dayOfWeek]
    };
  });

  const services = salon.services || [];
  const masters = salon.masters || [];
  const reviews = salon.reviews || [];

  // JSON-LD for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    name: salon.name,
    ...(salon.description ? { description: salon.description } : {}),
    ...(salon.address ? { address: { '@type': 'PostalAddress', streetAddress: salon.address } } : {}),
    ...(salon.phone ? { telephone: salon.phone } : {}),
    ...(salon.logo ? { image: salon.logo } : {}),
    ...(reviews.length > 0 ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: (reviews.reduce((sum: number, r: any) => sum + (r.rating || 5), 0) / reviews.length).toFixed(2),
        reviewCount: reviews.length,
      },
    } : {}),
  };

  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold tracking-tight text-gray-900">tholim</span>
            </div>
            <div className="flex items-center gap-3"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 lg:pb-0">
        {/* Hero Section */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[32px] lg:text-[44px] font-bold text-gray-900 mb-3 leading-tight">
                  {salon.name}
                </h1>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base">
                  {salon.review_count > 0 && (
                    <>
                      <div className="flex items-center gap-2">
                        <div className="relative inline-flex">
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-gray-200 text-gray-200" />)}
                          </div>
                          <div className="absolute inset-0 flex gap-0.5 overflow-hidden" style={{ width: `${(Number(salon.rating) / 5) * 100}%` }}>
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400 shrink-0" />)}
                          </div>
                        </div>
                        <span className="font-semibold text-gray-900 text-lg">{Number(salon.rating).toFixed(2).replace(/\.00$/, '.0')}</span>
                        <button
                          onClick={scrollToReviews}
                          className="text-blue-600 hover:text-blue-700 hover:underline cursor-pointer transition-colors"
                        >
                          ({salon.review_count.toLocaleString()} відгуків)
                        </button>
                      </div>
                      <span className="text-gray-300 text-lg">•</span>
                    </>
                  )}

                  <span className="text-gray-600">{salon.type}</span>
                  <span className="text-gray-300 text-lg">•</span>

                  <div className="flex items-center gap-1.5">
                    {isOpen ? (
                      <span className="text-green-600 font-medium">Відчинено</span>
                    ) : (
                      <>
                        <span className="text-red-500 font-medium">Зачинено</span>
                        {opensAt && <span className="text-gray-500">— відчиниться {opensAt}</span>}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: salon.name,
                      text: `${salon.name} - ${salon.type}`,
                      url: window.location.href,
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 cursor-pointer active:scale-95 self-end mb-0.5"
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
                className="relative h-[300px] rounded-xl overflow-hidden bg-gray-100 border border-gray-300"
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onClick={() => openGallery(mobilePhotoIndex)}
              >
                <div
                  className="absolute inset-0 flex transition-transform duration-400 ease-out"
                  style={{
                    width: `${photos.length * 100}%`,
                    transform: `translateX(calc(-${mobilePhotoIndex * (100 / photos.length)}% + ${swipeOffset}px))`,
                  }}
                >
                  {photos.map((photo, i) => (
                    <div key={i} className="relative h-full" style={{ width: `${100 / photos.length}%` }}>
                      <Image
                        src={photo}
                        alt={`${salon.name} ${i + 1}`}
                        fill
                        className="object-cover"
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
                {/* Story-style progress bars — only active one is filled */}
                <div className="absolute bottom-3 left-3 right-3 flex gap-1.5">
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      onClick={(e) => { e.stopPropagation(); setMobilePhotoIndex(index); }}
                      className="flex-1 rounded-full overflow-hidden cursor-pointer"
                      style={{
                        height: '4px',
                        backgroundColor: index === mobilePhotoIndex ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.2)',
                        transition: 'background-color 0.3s ease',
                      }}
                    />
                  ))}
                </div>
                <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg font-medium">
                  {mobilePhotoIndex + 1}/{photos.length}
                </div>
              </div>
            </div>

            {/* Desktop Gallery */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_0.4fr] gap-2 h-[420px]">
              <div className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group" onClick={() => openGallery(0)}>
                <Image src={photos[0]} alt={salon.name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" priority />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                <button
                  className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm text-gray-900 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white transition-all duration-200 flex items-center gap-2 shadow-sm cursor-pointer active:scale-95"
                  onClick={(e) => { e.stopPropagation(); openGallery(0); }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Дивитись усі
                </button>
              </div>

              <div className="grid grid-rows-2 gap-2">
                {photos[1] && (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group" onClick={() => openGallery(1)}>
                    <Image src={photos[1]} alt={`${salon.name} інтер'єр`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                )}
                {photos[2] && (
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group" onClick={() => openGallery(2)}>
                    <Image src={photos[2]} alt={`${salon.name} деталі`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10">
            {/* Left Column */}
            <div>
              {/* Address Row */}
              <div className="flex flex-col gap-3 mb-6 pb-6 border-b border-gray-100">
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <span className="text-sm">{salon.short_address || salon.address}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates_lat},${salon.coordinates_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Navigation className="w-5 h-5 shrink-0" />
                  Прокласти маршрут
                </a>
              </div>

              {/* Navigation Tabs */}
              <div className="border-b border-gray-200 mb-8">
                <nav className="flex gap-8 relative">
                  {tabs.map((tab, index) => (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        tabsRef.current[index] = el;
                        // Set initial underline on first tab mount
                        if (el && index === 0 && activeTab === tabs[0].id && underlineStyle.width === 0) {
                          setUnderlineStyle({ left: el.offsetLeft, width: el.offsetWidth });
                        }
                      }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`pb-4 text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === tab.id ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                  <div
                    className="absolute bottom-0 h-0.5 bg-gray-900"
                    style={{
                      left: underlineStyle.left,
                      width: underlineStyle.width,
                      transition: underlineStyle.width > 0 ? 'all 0.3s ease-out' : 'none',
                    }}
                  />
                </nav>
              </div>

              {/* Services Section */}
              {activeTab === "services" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Послуги</h2>

                  <div className="space-y-4">
                    {services.map((category: any) => {
                      const items = category.items || [];
                      const visibleItems = items.slice(0, 2);
                      const hasMore = items.length > 2;

                      return (
                        <div
                          key={category.id}
                          className="rounded-xl border border-gray-200 overflow-hidden bg-white"
                        >
                          {/* Category header */}
                          <div className="px-5 pt-4 pb-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                              {category.name}
                            </h3>
                          </div>

                          {/* Divider — full width */}
                          <div className="border-t border-gray-100" />

                          {/* Service rows */}
                          <div className="pb-1">
                            {visibleItems.map((service: any, idx: number) => (
                              <div key={service.id}>
                                <div className="flex items-center justify-between gap-3 px-5 py-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-gray-900 text-sm">{service.name}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {service.duration} · від {service.price} ₴
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => openBooking({ serviceId: service.id })}
                                    className="border border-gray-300 text-gray-700 text-xs px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer active:scale-95 shrink-0"
                                  >
                                    Обрати
                                  </button>
                                </div>
                                {/* Divider between services — indented 10% each side */}
                                {idx < visibleItems.length - 1 && (
                                  <div className="mx-[10%] border-t border-gray-100" />
                                )}
                              </div>
                            ))}
                          </div>

                          {/* "Show all" link */}
                          {hasMore && (
                            <>
                              <div className="border-t border-gray-100" />
                              <div className="px-5 py-4">
                                <button
                                  onClick={() => openBooking({ category: category.name })}
                                  className="text-sm text-gray-500 hover:text-gray-900 font-medium cursor-pointer transition-colors"
                                >
                                  Дивитись усі ({items.length})
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* All categories shown — no "view all" button needed */}
                </section>
              )}

              {/* Team Section */}
              {activeTab === "team" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Команда</h2>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    {masters.map((member: any) => (
                      <div key={member.id} className="group cursor-pointer">
                        <div className="relative mb-3">
                          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-100">
                            {member.avatar ? (
                              <Image
                                src={member.avatar}
                                alt={member.name}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                <span className="text-4xl font-bold text-gray-500">{member.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white rounded-xl px-2.5 py-1 shadow-md flex items-center gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold text-gray-900">{member.rating}</span>
                          </div>
                        </div>
                        <div className="text-center pt-2">
                          <h4 className="font-semibold text-gray-900 text-sm">{member.name}</h4>
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

                  <div className="flex items-center gap-2 mb-6">
                    {salon.review_count > 0 ? (
                      <>
                        <div className="relative inline-flex">
                          <div className="flex">
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-6 h-6 fill-gray-200 text-gray-200" />)}
                          </div>
                          <div className="absolute inset-0 flex overflow-hidden" style={{ width: `${(Number(salon.rating) / 5) * 100}%` }}>
                            {[1,2,3,4,5].map(s => <Star key={s} className="w-6 h-6 fill-yellow-400 text-yellow-400 shrink-0" />)}
                          </div>
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{Number(salon.rating).toFixed(2).replace(/\.00$/, '.0')}</span>
                        <span className="text-blue-600">({salon.review_count.toLocaleString()} відгуків)</span>
                      </>
                    ) : (
                      <span className="text-gray-500">Поки немає відгуків</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {reviews.map((review: any) => (
                      <div key={review.id} className="border-b border-gray-100 pb-5">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-9 h-9 rounded-xl ${review.author_color || 'bg-blue-500'} flex items-center justify-center text-white font-semibold text-sm`}>
                            {review.author_initial}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 text-sm leading-tight">{review.author_name}</h4>
                            <span className="text-xs text-gray-400">
                              {new Date(review.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
                            />
                          ))}
                        </div>
                        {review.service_name && (
                          <p className="text-xs text-gray-400 mb-1">💇 {review.service_name}</p>
                        )}
                        {review.text && <p className="text-sm text-gray-700">{review.text}</p>}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 4 && (
                    <button className="mt-6 px-6 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer">
                      Дивитись усі
                    </button>
                  )}
                </section>
              )}

              {/* About Section */}
              {activeTab === "about" && (
                <section className="animate-fadeIn">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">Загальні відомості</h2>

                  {salon.description && (
                    <p className="text-gray-600 leading-relaxed mb-8">{salon.description}</p>
                  )}

                  {/* Map — Google Maps embed, controls hidden via overflow crop */}
                  {(salon.coordinates_lat || salon.coordinates_lng) && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${salon.coordinates_lat},${salon.coordinates_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-2xl overflow-hidden mb-6 border border-gray-100 relative group cursor-pointer"
                      style={{ height: '220px' }}
                    >
                      <div className="absolute inset-0 overflow-hidden">
                        <iframe
                          width="100%"
                          style={{ border: 0, pointerEvents: 'none', height: 'calc(100% + 140px)', marginTop: '-70px' }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          src={`https://www.google.com/maps?q=${salon.coordinates_lat},${salon.coordinates_lng}&z=15&hl=uk&output=embed`}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 text-xs font-medium text-gray-700 group-hover:bg-white transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Відкрити карту
                      </div>
                    </a>
                  )}

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                      <p className="text-gray-900 font-medium">{salon.address}</p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates_lat},${salon.coordinates_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      <Navigation className="w-5 h-5 shrink-0" />
                      Прокласти маршрут
                    </a>
                  </div>

                  {/* Working Hours */}
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
                    <h3 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-400" />
                      Час роботи
                    </h3>
                    <div className="space-y-4">
                      {workingHoursWithToday.map((item: any) => (
                        <div key={item.day} className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <span className={`text-sm ${item.isToday ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                              {item.day}
                            </span>
                            {item.isToday && <span className="text-sm text-green-600 font-medium">(сьогодні)</span>}
                          </div>
                          <span className={`text-sm ${item.hours === "Зачинено" ? "text-gray-400" : item.isToday ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                            {item.hours}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Amenities */}
                  {salon.amenities && salon.amenities.length > 0 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                      <h3 className="font-semibold text-gray-900 mb-4">Додаткова інформація</h3>
                      <div className="space-y-3">
                        {salon.amenities.map((amenity: string, i: number) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Check className="w-3 h-3 text-gray-600" />
                            </div>
                            <span className="text-gray-600">{amenity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right Column - Sticky Sidebar */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${isScrolled ? "max-h-[170px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="px-5 pt-5 space-y-2 pb-4 border-b border-gray-200 h-[121px]">
                      <h3 className="font-bold text-gray-900 text-[28px] leading-tight">{salon.name}</h3>
                      {salon.review_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-lg">{Number(salon.rating).toFixed(2).replace(/\.00$/, '.0')}</span>
                          <div className="relative inline-flex">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-gray-200 text-gray-200" />)}
                            </div>
                            <div className="absolute inset-0 flex gap-0.5 overflow-hidden" style={{ width: `${(Number(salon.rating) / 5) * 100}%` }}>
                              {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />)}
                            </div>
                          </div>
                          <button onClick={scrollToReviews} className="text-blue-600 font-medium text-base hover:underline cursor-pointer">
                            ({salon.review_count.toLocaleString()} відгуків)
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Новий заклад</p>
                      )}
                    </div>
                  </div>

                  <div className={`px-5 transition-all duration-300 ${isScrolled ? "pt-4" : "pt-5"}`}>
                    <Button
                      onClick={() => openBooking()}
                      className="w-full bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white rounded-xl h-12 text-base font-semibold transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      Забронювати
                    </Button>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <button
                        onClick={() => setScheduleOpen(!scheduleOpen)}
                        className="flex items-center gap-3 w-full text-left cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isOpen ? "bg-green-50" : "bg-red-50"}`}>
                          <Clock className={`w-5 h-5 ${isOpen ? "text-green-600" : "text-red-500"}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1">
                            <span className={`font-medium ${isOpen ? "text-green-600" : "text-red-500"}`}>
                              {isOpen ? "Відчинено" : "Зачинено"}
                            </span>
                            <span className="text-gray-600">
                              {isOpen ? `до ${opensAt}` : opensAt ? `о ${opensAt.split(' о ')[1] || opensAt}` : ''}
                            </span>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${scheduleOpen ? "rotate-90" : ""}`} />
                          </div>
                        </div>
                      </button>

                      <div className={`overflow-hidden transition-all duration-300 ease-out ${scheduleOpen ? "max-h-[300px] opacity-100 mt-3" : "max-h-0 opacity-0"}`}>
                        <div className="pl-[52px] space-y-2">
                          {workingHoursWithToday.map((item: any) => (
                            <div key={item.day} className={`flex items-center gap-3 text-sm ${item.isToday ? "font-medium" : ""}`}>
                              <div className={`w-2 h-2 rounded-full ${item.hours === "Зачинено" ? "bg-gray-300" : "bg-green-500"}`} />
                              <span className={`flex-1 ${item.isToday ? "text-gray-900" : "text-gray-600"}`}>{item.day}</span>
                              <span className={`${item.isToday ? "text-gray-900 font-semibold" : item.hours === "Зачинено" ? "text-gray-400" : "text-gray-600"}`}>
                                {item.hours}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed flex-1 min-w-0">{salon.address}</p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${salon.coordinates_lat},${salon.coordinates_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Navigation className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-blue-600 font-medium text-sm hover:underline transition-colors">
                        Прокласти маршрут
                      </span>
                    </a>
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
          onClick={() => openBooking()}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-xl h-12 text-base font-semibold"
        >
          Забронювати
        </Button>
      </div>

      {/* Gallery Modal */}
      <GalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        photos={photos}
        initialIndex={galleryIndex}
        salonName={salon.name}
      />

      {/* Booking Modal */}
      <BookingModal
        isOpen={bookingOpen}
        onClose={() => {
          setBookingOpen(false);
          setBookingInitialCategory(undefined);
          setBookingPreSelectedServiceId(undefined);
        }}
        salonId={salon.id}
        salonName={salon.name}
        salonImage={photos[0]}
        salonRating={Number(salon.rating)}
        salonReviews={salon.review_count || 0}
        salonAddress={salon.short_address || salon.address || ''}
        services={services.map((cat: any) => ({
          category: cat.name,
          items: (cat.items || []).map((item: any) => ({
            id: item.id,
            name: item.name,
            duration: item.duration,
            durationMinutes: item.duration_minutes,
            price: item.price,
          }))
        }))}
        specialists={masters.map((member: any) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar || null,
          rating: member.rating,
          reviewCount: member.review_count,
          price: member.price,
        }))}
        initialCategory={bookingInitialCategory}
        preSelectedServiceId={bookingPreSelectedServiceId}
      />
    </div>
  );
}
