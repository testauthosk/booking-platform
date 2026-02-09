// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  DollarSign,
  Phone,
  Clock,
  Loader2,
  Menu,
  ChevronRight,
  User,
  CircleDot,
} from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

// ─── Types ───
interface TodayData {
  bookings: { total: number; completed: number; remaining: number; cancelled: number };
  revenue: number;
  nextClient: {
    name: string;
    phone: string;
    time: string;
    service: string;
    master: string;
  } | null;
  masters: MasterStatus[];
}

interface MasterStatus {
  id: string;
  name: string;
  avatar: string | null;
  color: string | null;
  status: 'working' | 'free' | 'off';
  currentService?: string;
  currentUntil?: string;
  currentClient?: string;
  nextAt?: string | null;
}

// ─── Helpers ───
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброго ранку';
  if (h < 18) return 'Доброго дня';
  return 'Доброго вечора';
}

function formatDate(): string {
  return new Date().toLocaleDateString('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatMoney(n: number): string {
  return n.toLocaleString('uk-UA');
}

function getInitial(name: string): string {
  return name?.charAt(0)?.toUpperCase() || '?';
}

// ─── Skeleton ───
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-24" />
      <Skeleton className="h-32" />
    </div>
  );
}

// ─── Status dot ───
function StatusDot({ status }: { status: 'working' | 'free' | 'off' }) {
  const colors = {
    working: 'bg-green-500',
    free: 'bg-gray-300',
    off: 'bg-gray-200',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]} flex-shrink-0`} />
  );
}

// ─── Progress ring ───
function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
      <div
        className="h-2 rounded-full bg-green-500 transition-all duration-700"
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ─── Page ───
export default function DashboardPage() {
  const { open: openSidebar } = useSidebar();
  const { data: session } = useSession();
  const [today, setToday] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard/today');
        if (res.ok) {
          setToday(await res.json());
        }
      } catch (e) {
        console.error('Dashboard load error:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const userName = session?.user?.name?.split(' ')[0] || '';

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={openSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {getGreeting()}{userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="text-sm text-gray-500 capitalize">{formatDate()}</p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-[84px] lg:pb-6">
        <div className="max-w-[1000px] mx-auto space-y-4">
          {loading ? (
            <DashboardSkeleton />
          ) : !today ? (
            <div className="text-center py-12 text-gray-400">
              Помилка завантаження
            </div>
          ) : (
            <>
              {/* Top cards: Bookings + Revenue */}
              <div className="grid grid-cols-2 gap-3">
                {/* Bookings today */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Записи</span>
                  </div>
                  {today.bookings.total === 0 ? (
                    <p className="text-sm text-gray-400">Немає записів</p>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{today.bookings.completed}</span>
                        <span className="text-sm text-gray-400">/ {today.bookings.total}</span>
                      </div>
                      <ProgressRing completed={today.bookings.completed} total={today.bookings.total} />
                      <p className="text-xs text-gray-400 mt-1.5">
                        Залишилось: {today.bookings.remaining}
                      </p>
                    </>
                  )}
                </Card>

                {/* Revenue today */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Виручка</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatMoney(today.revenue)} <span className="text-base font-normal text-gray-400">₴</span>
                  </div>
                  {today.bookings.total > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      ~{formatMoney(Math.round(today.revenue / today.bookings.total))} ₴/запис
                    </p>
                  )}
                </Card>
              </div>

              {/* Next client */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mb-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                      <User className="w-4 h-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Наступний клієнт</span>
                  </div>
                  {today.nextClient?.phone && (
                    <a
                      href={`tel:${today.nextClient.phone}`}
                      className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
                    >
                      <Phone className="w-4 h-4 text-green-600" />
                    </a>
                  )}
                </div>
                {today.nextClient ? (
                  <div className="mt-3">
                    <p className="font-semibold text-base">{today.nextClient.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {today.nextClient.time}
                      </span>
                      <span>{today.nextClient.service}</span>
                      <span className="text-gray-400">→ {today.nextClient.master}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-3">
                    {today.bookings.total > 0
                      ? 'Все на сьогодні завершено 🎉'
                      : 'Сьогодні записів немає'}
                  </p>
                )}
              </Card>

              {/* Masters status */}
              {today.masters.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Users className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Майстри</span>
                  </div>
                  <div className="space-y-2.5">
                    {today.masters.map(m => (
                      <div key={m.id} className="flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
                          style={{ backgroundColor: m.color || '#9ca3af' }}
                        >
                          {m.avatar ? (
                            <img src={m.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitial(m.name)
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          {m.status === 'working' && (
                            <p className="text-xs text-gray-500 truncate">
                              {m.currentService}{m.currentUntil ? ` до ${m.currentUntil}` : ''}
                            </p>
                          )}
                          {m.status === 'free' && m.nextAt && (
                            <p className="text-xs text-gray-400">Наступний о {m.nextAt}</p>
                          )}
                          {m.status === 'free' && !m.nextAt && (
                            <p className="text-xs text-gray-400">Вільна</p>
                          )}
                          {m.status === 'off' && (
                            <p className="text-xs text-gray-300">Вихідний</p>
                          )}
                        </div>

                        {/* Status dot */}
                        <StatusDot status={m.status} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Empty state for new salons */}
              {today.bookings.total === 0 && today.masters.length === 0 && (
                <Card className="p-6 text-center">
                  <p className="text-4xl mb-3">🚀</p>
                  <h3 className="font-semibold text-lg mb-1">Почніть з налаштування</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Додайте майстрів та послуги, щоб клієнти могли записатись
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Link href="/team">
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-1.5" />
                        Додати мастера
                      </Button>
                    </Link>
                    <Link href="/catalogue">
                      <Button variant="outline" size="sm">
                        Додати послуги
                      </Button>
                    </Link>
                  </div>
                </Card>
              )}

              {today.bookings.total === 0 && today.masters.length > 0 && (
                <Card className="p-6 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <h3 className="font-semibold text-lg mb-1">Сьогодні поки тихо</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Поділіться посиланням на вашу сторінку з клієнтами
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const slug = session?.user?.salonId || '';
                      navigator.clipboard.writeText(`${window.location.origin}/salon/${slug}`);
                    }}
                  >
                    🔗 Скопіювати посилання
                  </Button>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
