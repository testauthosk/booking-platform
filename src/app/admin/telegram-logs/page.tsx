'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageCircle,
  Search,
  Check,
  X,
  Bell,
  Key,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface TelegramLog {
  id: string;
  type: 'OTP' | 'REMINDER';
  recipient: string;
  recipientName: string;
  message: string;
  status: string;
  createdAt: string;
  errorMessage?: string | null;
}

export default function TelegramLogsPage() {
  const [logs, setLogs] = useState<TelegramLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    otpSent: 0,
    remindersSent: 0,
    errors: 0,
  });

  const perPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/telegram-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const totalPages = Math.ceil(total / perPage);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Telegram логи</h1>
        <p className="text-gray-400 text-sm">Історія повідомлень через Telegram бота</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#12121a] border-white/5 p-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.otpSent}</p>
              <p className="text-sm text-gray-500">OTP кодів</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.remindersSent}</p>
              <p className="text-sm text-gray-500">Нагадувань</p>
            </div>
          </div>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <div className="flex items-center gap-3">
            <X className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
              <p className="text-sm text-gray-500">Помилок</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по телефону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button onClick={handleSearch} className="bg-violet-600 hover:bg-violet-700">
          Шукати
        </Button>
        <Button
          onClick={fetchLogs}
          variant="outline"
          className="bg-transparent border-white/10 text-white hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Логів не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Отримувач</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Повідомлення</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        log.type === 'OTP' 
                          ? 'bg-violet-500/10 text-violet-400'
                          : 'bg-sky-500/10 text-sky-400'
                      }`}>
                        {log.type === 'OTP' ? <Key className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-sky-400" />
                        <div>
                          <p className="text-white">{log.recipientName}</p>
                          <p className="text-xs text-gray-500">{log.recipient}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-300 max-w-xs truncate block">
                        {log.message}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {log.status === 'error' ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                            <X className="w-3 h-3" />
                            Помилка
                          </span>
                          {log.errorMessage && (
                            <p className="text-xs text-red-400/60 mt-1 truncate max-w-[150px]">
                              {log.errorMessage}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                          <Check className="w-3 h-3" />
                          {log.status === 'verified' ? 'Підтверджено' : 'Надіслано'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">{formatDate(log.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
