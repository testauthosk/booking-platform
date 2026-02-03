'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Store,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Power,
  PowerOff,
  Edit2,
  MoreVertical,
  Users,
  Calendar,
  TrendingUp,
  ChevronDown,
  LogIn,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Salon {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  ownerId: string | null;
  owner?: { email: string; name: string | null } | null;
  _count?: {
    masters: number;
    bookings: number;
    clients: number;
  };
}

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    try {
      const res = await fetch('/api/admin/salons');
      if (res.ok) {
        const data = await res.json();
        setSalons(data);
      }
    } catch (error) {
      console.error('Error fetching salons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (salon: Salon) => {
    try {
      await fetch('/api/admin/salons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: salon.id, isActive: !salon.isActive }),
      });
      fetchSalons();
    } catch (error) {
      console.error('Error toggling salon:', error);
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/salon/${slug}`);
  };

  const loginAsSalon = async (salonId: string) => {
    // TODO: Implement impersonation
    alert('Функція в розробці');
  };

  const filteredSalons = salons
    .filter(s => {
      if (filter === 'active') return s.isActive;
      if (filter === 'inactive') return !s.isActive;
      return true;
    })
    .filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.owner?.email?.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total: salons.length,
    active: salons.filter(s => s.isActive).length,
    inactive: salons.filter(s => !s.isActive).length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Салони</h1>
          <p className="text-gray-400 text-sm">Управління всіма салонами платформи</p>
        </div>
        <Button className="bg-violet-600 hover:bg-violet-700">
          <Plus className="w-4 h-4 mr-2" />
          Новий салон
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'all' ? 'border-violet-500' : ''}`}
          onClick={() => setFilter('all')}
        >
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-gray-500">Всього</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'active' ? 'border-green-500' : ''}`}
          onClick={() => setFilter('active')}
        >
          <p className="text-2xl font-bold text-green-400">{stats.active}</p>
          <p className="text-sm text-gray-500">Активних</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'inactive' ? 'border-red-500' : ''}`}
          onClick={() => setFilter('inactive')}
        >
          <p className="text-2xl font-bold text-red-400">{stats.inactive}</p>
          <p className="text-sm text-gray-500">Вимкнених</p>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Пошук по назві, slug або email власника..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : filteredSalons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Салонів не знайдено</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Власник</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статистика</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSalons.map((salon) => (
                <tr key={salon.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                        <Store className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{salon.name}</p>
                        <p className="text-sm text-gray-500">/{salon.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {salon.owner ? (
                      <div>
                        <p className="text-sm text-white">{salon.owner.name || salon.owner.email}</p>
                        {salon.owner.name && (
                          <p className="text-xs text-gray-500">{salon.owner.email}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500 italic">Не призначено</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {salon._count?.masters || 0}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {salon._count?.bookings || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {salon.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Активний
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Вимкнено
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/salon/${salon.slug}`}
                        target="_blank"
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Відкрити сайт"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => copyLink(salon.slug)}
                        className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Копіювати посилання"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                          <DropdownMenuItem 
                            onClick={() => loginAsSalon(salon.id)}
                            className="text-gray-300 focus:text-white focus:bg-white/10"
                          >
                            <LogIn className="w-4 h-4 mr-2" />
                            Увійти як адмін
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-300 focus:text-white focus:bg-white/10">
                            <Edit2 className="w-4 h-4 mr-2" />
                            Редагувати
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => toggleActive(salon)}
                            className={salon.isActive 
                              ? "text-red-400 focus:text-red-400 focus:bg-red-500/10"
                              : "text-green-400 focus:text-green-400 focus:bg-green-500/10"
                            }
                          >
                            {salon.isActive ? (
                              <>
                                <PowerOff className="w-4 h-4 mr-2" />
                                Вимкнути
                              </>
                            ) : (
                              <>
                                <Power className="w-4 h-4 mr-2" />
                                Увімкнути
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
