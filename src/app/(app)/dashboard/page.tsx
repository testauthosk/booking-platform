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
  Menu,
  ChevronRight,
  User,
  Plus,
  Ban,
  Link2,
} from 'lucide-react';
import { useSidebar } from '@/components/sidebar-context';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ─── Types ───
interface AlertItem {
  type: string;
  title: string;
  count: number;
  link: string;
  icon: string;
}

interface WeekData {
  revenue: number;
  revenueChange: number;
  bookings: number;
  bookingsChange: number;
  newClients: number;
  avgCheck: number;
}

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

interface FeedItem {
  id: string;
  type: string;
  label: string;
  client: string;
  service: string;
  master: string;
  date: string;
  time: string;
  price: number;
  createdAt: string;
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

// ─── Week Card ───
function WeekCard({ label, value, change }: { label: string; value: string; change?: number }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold">{value}</span>
        {change !== undefined && change !== 0 && (
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>
            {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
    </Card>
  );
}

// ─── Page ───
export default function DashboardPage() {
  const { open: openSidebar } = useSidebar();
  const { data: session } = useSession();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [today, setToday] = useState<TodayData | null>(null);
  const [week, setWeek] = useState<WeekData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [todayRes, weekRes, alertsRes, feedRes] = await Promise.all([
          fetch('/api/dashboard/today'),
          fetch('/api/dashboard/week'),
          fetch('/api/dashboard/alerts'),
          fetch('/api/dashboard/feed'),
        ]);
        if (todayRes.ok) setToday(await todayRes.json());
        if (weekRes.ok) setWeek(await weekRes.json());
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.alerts || []);
        }
        if (feedRes.ok) {
          const data = await feedRes.json();
          setFeed(data.feed || []);
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
      <div className="bg-white border-b px-4 lg:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={openSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {getGreeting()}{userName ? `, ${userName}` : ''}
            </h1>
            <p className="text-sm text-gray-500 capitalize">{formatDate()}</p>
          </div>
        </div>
        {/* Bell is in global Header */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:px-8 lg:py-6 pb-[84px] lg:pb-6">
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5"
              onClick={() => router.push('/calendar')}
            >
              <Plus className="w-3.5 h-3.5" />
              Запис
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5"
              onClick={() => router.push('/calendar')}
            >
              <Ban className="w-3.5 h-3.5" />
              Блокувати час
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-shrink-0 gap-1.5"
              onClick={() => router.push('/calendar')}
            >
              <Calendar className="w-3.5 h-3.5" />
              Календар
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={`flex-shrink-0 gap-1.5 ${copied ? 'text-green-600 border-green-300' : ''}`}
              onClick={async () => {
                try {
                  // Fetch salon slug
                  const res = await fetch('/api/salon/settings');
                  if (res.ok) {
                    const salon = await res.json();
                    const url = `${window.location.origin}/salon/${salon.slug}`;
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                } catch {}
              }}
            >
              {copied ? (
                <>✓ Скопійовано</>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Посилання
                </>
              )}
            </Button>
          </div>

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

                {/* Recent activity feed */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-500">Останні події</span>
                  </div>
                  {feed.length === 0 ? (
                    <p className="text-sm text-gray-400">Поки подій немає</p>
                  ) : (
                    <div className="space-y-3">
                      {feed.slice(0, 3).map(item => (
                        <div key={item.id} className="text-xs space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span>{item.label.split(' ')[0]}</span>
                            <span className="font-medium text-gray-800">{item.client}</span>
                          </div>
                          <p className="text-gray-500">
                            {item.service} · {item.master} · {item.date} {item.time}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Week metrics */}
              {week && (
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Цей тиждень</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <WeekCard label="Виручка" value={`${formatMoney(week.revenue)} ₴`} change={week.revenueChange} />
                    <WeekCard label="Записів" value={String(week.bookings)} change={week.bookingsChange} />
                    <WeekCard label="Нових клієнтів" value={String(week.newClients)} />
                    <WeekCard label="Середній чек" value={`${formatMoney(week.avgCheck)} ₴`} />
                  </div>
                </div>
              )}

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

              {/* Smart Alerts */}
              {alerts.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                      <span className="text-sm">⚡</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">Потребує уваги</span>
                  </div>
                  <div className="space-y-2">
                    {alerts.map((a, i) => (
                      <Link
                        key={i}
                        href={a.link}
                        className="flex items-center gap-3 p-2.5 -mx-1 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <span className="text-lg flex-shrink-0">{a.icon}</span>
                        <span className="text-sm flex-1">{a.title}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

              {!loading && alerts.length === 0 && today && today.bookings.total > 0 && (
                <div className="text-center py-2">
                  <span className="text-sm text-green-600">Все під контролем ✅</span>
                </div>
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
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/salon/settings');
                        if (res.ok) {
                          const salon = await res.json();
                          await navigator.clipboard.writeText(`${window.location.origin}/salon/${salon.slug}`);
                        }
                      } catch {}
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
