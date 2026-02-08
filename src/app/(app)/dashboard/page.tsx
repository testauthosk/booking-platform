'use client';

import { Suspense, useEffect, useState } from 'react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Menu, TrendingUp, Calendar, Users, DollarSign, Loader2, ExternalLink, ArrowRight, Settings, PartyPopper } from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

interface Booking {
  id: string;
  client_name: string;
  date: string;
  time: string;
  duration: number;
  service_name: string;
  status: string;
}

interface DashboardData {
  salon: {
    name: string;
    slug: string;
  } | null;
  clients: Array<{ id: string }>;
  bookings: Booking[];
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { open: openSidebar } = useSidebar();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingIncomplete, setOnboardingIncomplete] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/data')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));

    // Перевіряємо онбордінг
    fetch('/api/salon/onboarding')
      .then(res => res.json())
      .then(result => {
        if (!result.completed) setOnboardingIncomplete(true);
      })
      .catch(console.error);
  }, []);

  // Get upcoming bookings (today and future, not cancelled)
  const getUpcomingBookings = () => {
    if (!data?.bookings) return [];
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return data.bookings
      .filter(b => {
        const bookingDate = new Date(b.date);
        bookingDate.setHours(0, 0, 0, 0);
        return bookingDate >= today && b.status !== 'cancelled';
      })
      .sort((a, b) => {
        const dateA = new Date(a.date + 'T' + a.time);
        const dateB = new Date(b.date + 'T' + b.time);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) return `${hours}г ${mins}хв`;
    if (hours > 0) return `${hours}г`;
    return `${mins}хв`;
  };

  const upcomingBookings = getUpcomingBookings();
  const totalClients = data?.clients?.length || 0;
  const totalBookings = upcomingBookings.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header
        className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-20 sticky top-0"
        style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <button
          onClick={openSidebar}
          className="shrink-0 active:scale-95 transition-transform"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu className="text-gray-700" style={{ width: 18, height: 18 }} />
        </button>
        
        <h1 className="flex-1 text-center text-base font-semibold truncate">Головна</h1>

        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <NotificationBell />
          <div
            className="bg-orange-500 text-white text-sm font-medium shrink-0"
            style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {data?.salon?.name?.[0] || 'T'}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4 lg:space-y-6">
        {/* Welcome banner after registration */}
        {isWelcome && !welcomeDismissed && (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <PartyPopper className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Ласкаво просимо!</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">
                Ваш акаунт створено. Починайте додавати послуги та приймати записи.
              </p>
              <button
                onClick={() => setWelcomeDismissed(true)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors"
              >
                Зрозуміло 👍
              </button>
            </div>
          </div>
        )}

        {/* Onboarding incomplete banner */}
        {onboardingIncomplete && !onboardingDismissed && (
          <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl p-5 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="h-5 w-5" />
                <h3 className="font-semibold text-lg">Завершіть налаштування</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">
                Декілька кроків залишилось, щоб ваш салон був готовий до роботи
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/register')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white text-violet-600 rounded-xl font-semibold text-sm hover:bg-white/90 transition-colors"
                >
                  Продовжити
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOnboardingDismissed(true)}
                  className="px-4 py-2.5 text-white/70 hover:text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Пізніше
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop title + View site button */}
        <div className="flex items-center justify-between">
          <h1 className="hidden lg:block text-2xl font-bold">Головна панель</h1>
          {data?.salon?.slug && (
            <Link
              href={`/salon/${data.salon.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Переглянути сайт</span>
              <span className="sm:hidden">Сайт</span>
            </Link>
          )}
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0 €</p>
                  <p className="text-xs text-muted-foreground">Продажі</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalBookings}</p>
                  <p className="text-xs text-muted-foreground">Записи</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalClients}</p>
                  <p className="text-xs text-muted-foreground">Клієнти</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-xs text-muted-foreground">Зростання</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent bookings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Найближчі записи</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/calendar">Усі</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Немає найближчих записів</p>
            ) : (
              upcomingBookings.map((booking) => (
                <div 
                  key={booking.id}
                  className="flex items-center justify-between p-3 border rounded-lg transition-all hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{booking.service_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.client_name} · {formatDuration(booking.duration)}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground text-right">
                    <p>{formatDate(booking.date)}</p>
                    <p>{booking.time}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href="/calendar">
              <Calendar className="h-5 w-5" />
              <span>Календар</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
            <Link href="/clients">
              <Users className="h-5 w-5" />
              <span>Клієнти</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
