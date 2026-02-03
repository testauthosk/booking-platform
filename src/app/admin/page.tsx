'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Store,
  Users,
  Calendar,
  TrendingUp,
  Activity,
  MessageCircle,
  Package,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface DashboardStats {
  salons: { total: number; active: number; new: number };
  users: { total: number; admins: number; masters: number };
  clients: { total: number; withTelegram: number; new: number };
  bookings: { today: number; week: number; month: number; completed: number; cancelled: number };
  reminders: { sent24h: number; sent2h: number; failed: number };
  inventory: { totalProducts: number; lowStock: number; totalValue: number };
  system: { dbStatus: string; telegramStatus: string; uptime: string };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/5 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default stats if API not ready
  const s = stats || {
    salons: { total: 0, active: 0, new: 0 },
    users: { total: 0, admins: 0, masters: 0 },
    clients: { total: 0, withTelegram: 0, new: 0 },
    bookings: { today: 0, week: 0, month: 0, completed: 0, cancelled: 0 },
    reminders: { sent24h: 0, sent2h: 0, failed: 0 },
    inventory: { totalProducts: 0, lowStock: 0, totalValue: 0 },
    system: { dbStatus: 'unknown', telegramStatus: 'unknown', uptime: '-' },
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Дашборд</h1>
          <p className="text-gray-400 text-sm">Загальна статистика платформи</p>
        </div>
        <div className="text-sm text-gray-500">
          Оновлено: {new Date().toLocaleTimeString('uk-UA')}
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-4 gap-4">
        {/* Salons */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Store className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +{s.salons.new}
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{s.salons.total}</p>
          <p className="text-sm text-gray-500">Салонів</p>
          <div className="mt-2 text-xs text-gray-400">
            {s.salons.active} активних
          </div>
        </Card>

        {/* Users */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{s.users.total}</p>
          <p className="text-sm text-gray-500">Користувачів</p>
          <div className="mt-2 text-xs text-gray-400">
            {s.users.admins} адмінів, {s.users.masters} майстрів
          </div>
        </Card>

        {/* Clients */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xs text-green-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              +{s.clients.new}
            </span>
          </div>
          <p className="text-2xl font-bold text-white">{s.clients.total}</p>
          <p className="text-sm text-gray-500">Клієнтів</p>
          <div className="mt-2 text-xs text-gray-400">
            {s.clients.withTelegram} з Telegram
          </div>
        </Card>

        {/* Bookings today */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{s.bookings.today}</p>
          <p className="text-sm text-gray-500">Записів сьогодні</p>
          <div className="mt-2 text-xs text-gray-400">
            {s.bookings.week} за тиждень
          </div>
        </Card>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        {/* Bookings breakdown */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Бронювання за місяць
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Всього</span>
              <span className="font-semibold text-white">{s.bookings.month}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-400" />
                Виконано
              </span>
              <span className="font-semibold text-green-400">{s.bookings.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <XCircle className="w-3 h-3 text-red-400" />
                Скасовано
              </span>
              <span className="font-semibold text-red-400">{s.bookings.cancelled}</span>
            </div>
          </div>
        </Card>

        {/* Reminders */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            Нагадування (24г)
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">За 24 години</span>
              <span className="font-semibold text-white">{s.reminders.sent24h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">За 2 години</span>
              <span className="font-semibold text-white">{s.reminders.sent2h}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                Помилки
              </span>
              <span className={`font-semibold ${s.reminders.failed > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                {s.reminders.failed}
              </span>
            </div>
          </div>
        </Card>

        {/* Inventory */}
        <Card className="bg-[#12121a] border-white/5 p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            Склад
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Товарів</span>
              <span className="font-semibold text-white">{s.inventory.totalProducts}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                <AlertTriangle className="w-3 h-3 text-orange-400" />
                Закінчується
              </span>
              <span className={`font-semibold ${s.inventory.lowStock > 0 ? 'text-orange-400' : 'text-gray-500'}`}>
                {s.inventory.lowStock}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Вартість</span>
              <span className="font-semibold text-white">{s.inventory.totalValue.toLocaleString()} ₴</span>
            </div>
          </div>
        </Card>
      </div>

      {/* System status */}
      <Card className="bg-[#12121a] border-white/5 p-5">
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-400" />
          Стан системи
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${s.system.dbStatus === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <p className="text-sm text-white">База даних</p>
              <p className="text-xs text-gray-500">PostgreSQL</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${s.system.telegramStatus === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <div>
              <p className="text-sm text-white">Telegram Bot</p>
              <p className="text-xs text-gray-500">Webhook active</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div>
              <p className="text-sm text-white">Vercel</p>
              <p className="text-xs text-gray-500">Production</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-sm text-white">Uptime</p>
              <p className="text-xs text-gray-500">{s.system.uptime}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
