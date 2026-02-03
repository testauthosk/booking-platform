'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  Bell,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Send,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Phone,
} from 'lucide-react';

interface Reminder {
  id: string;
  bookingId: string;
  type: string;
  channel: string;
  status: string;
  errorMessage: string | null;
  sentAt: string;
  booking: {
    clientName: string;
    clientPhone: string;
    serviceName: string | null;
    date: string;
    time: string;
    salon: { name: string };
  } | null;
}

interface Stats {
  totalSent: number;
  sentToday: number;
  sentWeek: number;
  sentMonth: number;
  failed: number;
  sent24h: number;
  sent2h: number;
  activeSettings: number;
  totalSettings: number;
  clientsWithTelegram: number;
}

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  useEffect(() => {
    fetchReminders();
  }, [page, filter]);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (filter.status) params.set('status', filter.status);
      if (filter.type) params.set('type', filter.type);

      const res = await fetch(`/api/admin/reminders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReminders(data.reminders);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerReminders = async () => {
    setTriggering(true);
    try {
      const res = await fetch('/api/admin/reminders', { method: 'POST' });
      const result = await res.json();
      alert(`Надіслано: ${result.sent24h || 0} (24г) + ${result.sent2h || 0} (2г), помилок: ${result.errors || 0}`);
      fetchReminders();
    } catch (error) {
      console.error('Error triggering reminders:', error);
      alert('Помилка відправки');
    } finally {
      setTriggering(false);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Нагадування</h1>
          <p className="text-gray-400 text-sm">Статистика та історія відправки</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchReminders}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Оновити
          </Button>
          <Button 
            onClick={triggerReminders}
            disabled={triggering}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Send className={`w-4 h-4 mr-2 ${triggering ? 'animate-pulse' : ''}`} />
            Надіслати зараз
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-[#12121a] border-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sentWeek}</p>
                <p className="text-sm text-gray-500">За тиждень</p>
              </div>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-gray-500">
              <span>{stats.sent24h} за 24г</span>
              <span>{stats.sent2h} за 2г</span>
            </div>
          </Card>

          <Card className="bg-[#12121a] border-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.sentToday}</p>
                <p className="text-sm text-gray-500">Сьогодні</p>
              </div>
            </div>
          </Card>

          <Card 
            className={`bg-[#12121a] border-white/5 p-5 cursor-pointer ${filter.status === 'failed' ? 'border-red-500' : ''}`}
            onClick={() => setFilter({ ...filter, status: filter.status === 'failed' ? '' : 'failed' })}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                <p className="text-sm text-gray-500">Помилки</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[#12121a] border-white/5 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.clientsWithTelegram}</p>
                <p className="text-sm text-gray-500">Клієнтів з TG</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Settings overview */}
      {stats && (
        <Card className="bg-[#12121a] border-white/5 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-white font-medium">Налаштування салонів</p>
                <p className="text-sm text-gray-500">
                  {stats.activeSettings} з {stats.totalSettings} салонів увімкнули нагадування
                </p>
              </div>
            </div>
            <div className="h-2 w-32 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-violet-500 rounded-full"
                style={{ width: `${stats.totalSettings ? (stats.activeSettings / stats.totalSettings) * 100 : 0}%` }}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.type}
          onChange={(e) => { setFilter({ ...filter, type: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm"
        >
          <option value="">Всі типи</option>
          <option value="24h">За 24 години</option>
          <option value="2h">За 2 години</option>
        </select>
        <select
          value={filter.status}
          onChange={(e) => { setFilter({ ...filter, status: e.target.value }); setPage(1); }}
          className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm"
        >
          <option value="">Всі статуси</option>
          <option value="sent">Надіслано</option>
          <option value="failed">Помилка</option>
        </select>
      </div>

      {/* Reminders list */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : reminders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Нагадувань не знайдено</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-white/5">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      reminder.status === 'sent' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {reminder.status === 'sent' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">
                          {reminder.booking?.clientName || 'Клієнт'}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          reminder.type === '24h' 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {reminder.type === '24h' ? 'За 24г' : 'За 2г'}
                        </span>
                      </div>
                      {reminder.booking && (
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {reminder.booking.clientPhone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {reminder.booking.date} {reminder.booking.time}
                          </span>
                          <span>{reminder.booking.salon?.name}</span>
                        </div>
                      )}
                      {reminder.errorMessage && (
                        <p className="text-sm text-red-400 mt-1">{reminder.errorMessage}</p>
                      )}
                    </div>

                    {/* Time */}
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(reminder.sentAt).toLocaleString('uk-UA')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-white/5">
                <p className="text-sm text-gray-500">
                  Показано {(page - 1) * perPage + 1}-{Math.min(page * perPage, total)} з {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="bg-transparent border-white/10 text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-400">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages}
                    className="bg-transparent border-white/10 text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
