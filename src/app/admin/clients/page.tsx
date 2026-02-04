'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Phone,
  Mail,
  Store,
  Calendar,
  DollarSign,
  MessageCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  telegramChatId: string | null;
  telegramUsername: string | null;
  visitsCount: number;
  totalSpent: number;
  lastVisit: string | null;
  notes: string | null;
  createdAt: string;
  salon: { id: string; name: string; slug: string };
  _count: { bookings: number; reviews: number };
}

interface Salon {
  id: string;
  name: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('');
  const [telegramFilter, setTelegramFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalAll: 0, withTelegram: 0 });
  const perPage = 50;

  useEffect(() => {
    fetchClients();
  }, [page, salonFilter, telegramFilter]);

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);
      if (salonFilter) params.set('salonId', salonFilter);
      if (telegramFilter) params.set('hasTelegram', telegramFilter);

      const res = await fetch(`/api/admin/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients);
        setTotal(data.total);
        setStats({
          totalAll: data.totalAll,
          withTelegram: data.withTelegram,
        });
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/admin/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
      }
    } catch (error) {
      console.error('Error fetching salons:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchClients();
  };

  const handleDelete = async (client: Client) => {
    if (!confirm(`Видалити клієнта ${client.name}?`)) return;

    try {
      const res = await fetch(`/api/admin/clients?id=${client.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Клієнти</h1>
          <p className="text-gray-400 text-sm">База клієнтів всіх салонів</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-[#12121a] border-white/5 p-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-violet-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAll}</p>
              <p className="text-sm text-gray-500">Всього клієнтів</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${telegramFilter === 'true' ? 'border-sky-500' : ''}`}
          onClick={() => setTelegramFilter(telegramFilter === 'true' ? '' : 'true')}
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.withTelegram}</p>
              <p className="text-sm text-gray-500">З Telegram</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${telegramFilter === 'false' ? 'border-gray-500' : ''}`}
          onClick={() => setTelegramFilter(telegramFilter === 'false' ? '' : 'false')}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAll - stats.withTelegram}</p>
              <p className="text-sm text-gray-500">Без Telegram</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по імені, телефону, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <select
          value={salonFilter}
          onChange={(e) => { setSalonFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm min-w-[200px]"
        >
          <option value="">Всі салони</option>
          {salons.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <Button onClick={handleSearch} className="bg-violet-600 hover:bg-violet-700">
          Шукати
        </Button>
      </div>

      {/* Clients table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Клієнтів не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Клієнт</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Контакти</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статистика</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Telegram</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-violet-500/20 flex items-center justify-center text-violet-400 font-medium">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{client.name}</p>
                          <p className="text-xs text-gray-500">
                            з {new Date(client.createdAt).toLocaleDateString('uk-UA')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Phone className="w-3 h-3" />
                          {client.phone}
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-2 text-gray-500">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-400">
                        <Store className="w-4 h-4" />
                        <span className="text-sm">{client.salon.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-400 flex items-center gap-1" title="Візити">
                          <Calendar className="w-3 h-3" />
                          {client.visitsCount}
                        </span>
                        <span className="text-gray-400 flex items-center gap-1" title="Витрачено">
                          <DollarSign className="w-3 h-3" />
                          {client.totalSpent.toLocaleString()} ₴
                        </span>
                        {client._count.reviews > 0 && (
                          <span className="text-yellow-400 flex items-center gap-1" title="Відгуки">
                            <Star className="w-3 h-3" />
                            {client._count.reviews}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {client.telegramChatId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400">
                          <MessageCircle className="w-3 h-3" />
                          Підключено
                        </span>
                      ) : (
                        <span className="text-gray-600 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/salon/${client.salon.slug}`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                          title="Відкрити салон"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                            <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/10">
                              <Edit2 className="w-4 h-4 mr-2" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/10">
                              <Calendar className="w-4 h-4 mr-2" />
                              Історія візитів
                            </DropdownMenuItem>
                            {client.telegramChatId && (
                              <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/10">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Написати в Telegram
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(client)}
                              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
