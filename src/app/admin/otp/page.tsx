'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Key,
  Search,
  Phone,
  Mail,
  Clock,
  Check,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface OtpCode {
  id: string;
  phone: string;
  email: string;
  code: string;
  type: string;
  channel: string;
  verified: boolean;
  attempts: number;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
  isActive: boolean;
  user?: { id: string; email: string; name: string | null } | null;
}

export default function OtpPage() {
  const [otpCodes, setOtpCodes] = useState<OtpCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
  });
  const [cleaningUp, setCleaningUp] = useState(false);

  const perPage = 50;

  useEffect(() => {
    fetchOtpCodes();
  }, [page, filter]);

  const fetchOtpCodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
        filter,
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/otp?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOtpCodes(data.otpCodes);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching OTP codes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOtpCodes();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цей OTP код?')) return;

    try {
      const res = await fetch(`/api/admin/otp?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchOtpCodes();
      }
    } catch (error) {
      console.error('Error deleting OTP:', error);
    }
  };

  const cleanupExpired = async () => {
    if (!confirm('Видалити всі прострочені та використані OTP коди?')) return;

    setCleaningUp(true);
    try {
      const res = await fetch('/api/admin/otp?cleanupExpired=true', {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Видалено ${data.deleted} кодів`);
        fetchOtpCodes();
      }
    } catch (error) {
      console.error('Error cleaning up OTP:', error);
    } finally {
      setCleaningUp(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">OTP Debug</h1>
          <p className="text-gray-400 text-sm">Одноразові паролі для автентифікації</p>
        </div>
        <Button
          onClick={cleanupExpired}
          disabled={cleaningUp}
          variant="outline"
          className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {cleaningUp ? 'Очищення...' : 'Видалити прострочені'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'all' ? 'border-violet-500' : ''}`}
          onClick={() => { setFilter('all'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-gray-500">Всього</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'active' ? 'border-green-500' : ''}`}
          onClick={() => { setFilter('active'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          <p className="text-sm text-gray-500">Активних</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'used' ? 'border-blue-500' : ''}`}
          onClick={() => { setFilter('used'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-blue-400">{stats.used}</p>
          <p className="text-sm text-gray-500">Використаних</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'expired' ? 'border-red-500' : ''}`}
          onClick={() => { setFilter('expired'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
          <p className="text-sm text-gray-500">Прострочених</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по телефону, email або коду..."
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
          onClick={fetchOtpCodes}
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
        ) : otpCodes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>OTP кодів не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Контакт</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Код</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Канал</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Термін</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {otpCodes.map((otp) => (
                  <tr key={otp.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {otp.phone ? (
                          <>
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-white">{otp.phone}</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-white">{otp.email}</span>
                          </>
                        )}
                      </div>
                      {otp.user && (
                        <p className="text-xs text-gray-500 mt-1">
                          {otp.user.name || otp.user.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-lg text-violet-400">{otp.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-gray-400">{otp.type}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        otp.channel === 'TELEGRAM' 
                          ? 'bg-sky-500/10 text-sky-400'
                          : otp.channel === 'EMAIL'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-gray-500/10 text-gray-400'
                      }`}>
                        {otp.channel}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {otp.verified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                          <Check className="w-3 h-3" />
                          Використано
                        </span>
                      ) : otp.isExpired ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                          <X className="w-3 h-3" />
                          Прострочено
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                          <Clock className="w-3 h-3" />
                          Активний
                        </span>
                      )}
                      {otp.attempts > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Спроб: {otp.attempts}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="text-gray-400">{formatDate(otp.createdAt)}</p>
                        <p className="text-xs text-gray-500">
                          до {formatDate(otp.expiresAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDelete(otp.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
