'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail,
  Search,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

interface EmailLog {
  id: string;
  to: string | null;
  subject: string;
  type: string;
  status: string;
  createdAt: string;
  user?: { id: string; email: string; name: string | null } | null;
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    expired: 0,
  });

  const perPage = 50;

  useEffect(() => {
    fetchEmails();
  }, [page]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/emails?${params}`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchEmails();
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'verified':
        return { icon: Check, color: 'bg-green-500/10 text-green-400', label: 'Підтверджено' };
      case 'expired':
        return { icon: X, color: 'bg-red-500/10 text-red-400', label: 'Прострочено' };
      default:
        return { icon: Clock, color: 'bg-blue-500/10 text-blue-400', label: 'Надіслано' };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Email логи</h1>
        <p className="text-gray-400 text-sm">Історія відправлених email повідомлень</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-gray-500">Всього</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-green-400">{stats.verified}</p>
          <p className="text-sm text-gray-500">Підтверджено</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-red-400">{stats.expired}</p>
          <p className="text-sm text-gray-500">Прострочено</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по email..."
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
          onClick={fetchEmails}
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
        ) : emails.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Email логів не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Отримувач</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тема</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дата</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {emails.map((email) => {
                  const statusConfig = getStatusConfig(email.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <tr key={email.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-white">{email.to}</p>
                            {email.user?.name && (
                              <p className="text-xs text-gray-500">{email.user.name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-300">{email.subject}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-400">{email.type}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-400">{formatDate(email.createdAt)}</span>
                      </td>
                    </tr>
                  );
                })}
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
