'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Calendar,
  Search,
  Clock,
  User,
  Scissors,
  Store,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Booking {
  id: string;
  date: string;
  time: string;
  timeEnd: string | null;
  duration: number;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  clientName: string;
  clientPhone: string;
  serviceName: string | null;
  masterName: string | null;
  price: number;
  notes: string | null;
  createdAt: string;
  salon: { id: string; name: string; slug: string };
  master: { id: string; name: string } | null;
  client: { id: string; name: string; telegramChatId: string | null } | null;
}

interface Salon {
  id: string;
  name: string;
}

interface Master {
  id: string;
  name: string;
  salonId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  PENDING: { label: 'Очікує', color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  CONFIRMED: { label: 'Підтверджено', color: 'bg-blue-500/10 text-blue-400', icon: CheckCircle },
  COMPLETED: { label: 'Виконано', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  CANCELLED: { label: 'Скасовано', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  NO_SHOW: { label: 'Не з\'явився', color: 'bg-orange-500/10 text-orange-400', icon: AlertTriangle },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [salonFilter, setSalonFilter] = useState('');
  const [masterFilter, setMasterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    byStatus: {} as Record<string, number>,
    today: 0,
    monthRevenue: 0,
  });
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  
  const perPage = 50;

  useEffect(() => {
    fetchBookings();
  }, [page, salonFilter, masterFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchSalons();
  }, []);

  useEffect(() => {
    // Fetch masters when salon changes
    if (salonFilter) {
      fetchMasters(salonFilter);
    } else {
      setMasters([]);
      setMasterFilter('');
    }
  }, [salonFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);
      if (salonFilter) params.set('salonId', salonFilter);
      if (masterFilter) params.set('masterId', masterFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const res = await fetch(`/api/admin/bookings?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setSelectedIds(new Set());
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

  const fetchMasters = async (salonId: string) => {
    try {
      // Use the salon's masters endpoint or add a simple query
      const res = await fetch(`/api/admin/users?type=master&salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data.users.map((u: { id: string; name: string; salonId: string }) => ({
          id: u.id,
          name: u.name,
          salonId: u.salonId,
        })));
      }
    } catch (error) {
      console.error('Error fetching masters:', error);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchBookings();
  };

  const updateStatus = async (booking: Booking, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: booking.id, status: newStatus }),
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
    }
  };

  const handleDelete = async (booking: Booking) => {
    if (!confirm(`Видалити запис ${booking.clientName}?`)) return;

    try {
      const res = await fetch(`/api/admin/bookings?id=${booking.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Видалити ${selectedIds.size} вибраних записів?`)) return;

    setDeleting(true);
    try {
      const ids = Array.from(selectedIds).join(',');
      const res = await fetch(`/api/admin/bookings?ids=${ids}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Видалено ${data.deleted} записів`);
        fetchBookings();
      }
    } catch (error) {
      console.error('Error bulk deleting:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map(b => b.id)));
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Бронювання</h1>
          <p className="text-gray-400 text-sm">Всі записи всіх салонів</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button 
              onClick={handleBulkDelete}
              disabled={deleting}
              variant="outline" 
              className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Видалити ({selectedIds.size})
            </Button>
          )}
          <Button variant="outline" className="bg-transparent border-white/10 text-white hover:bg-white/5">
            <Download className="w-4 h-4 mr-2" />
            Експорт
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-white">{stats.today}</p>
          <p className="text-sm text-gray-500">Сьогодні</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer ${statusFilter === 'CONFIRMED' ? 'border-blue-500' : ''}`}
          onClick={() => { setStatusFilter(statusFilter === 'CONFIRMED' ? '' : 'CONFIRMED'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-blue-400">{stats.byStatus.CONFIRMED || 0}</p>
          <p className="text-sm text-gray-500">Підтверджено</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer ${statusFilter === 'COMPLETED' ? 'border-green-500' : ''}`}
          onClick={() => { setStatusFilter(statusFilter === 'COMPLETED' ? '' : 'COMPLETED'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-green-400">{stats.byStatus.COMPLETED || 0}</p>
          <p className="text-sm text-gray-500">Виконано</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer ${statusFilter === 'CANCELLED' ? 'border-red-500' : ''}`}
          onClick={() => { setStatusFilter(statusFilter === 'CANCELLED' ? '' : 'CANCELLED'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-red-400">{stats.byStatus.CANCELLED || 0}</p>
          <p className="text-sm text-gray-500">Скасовано</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-white">{stats.monthRevenue.toLocaleString()} ₴</p>
          <p className="text-sm text-gray-500">Виручка за місяць</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по клієнту, послузі, майстру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <select
          value={salonFilter}
          onChange={(e) => { setSalonFilter(e.target.value); setMasterFilter(''); setPage(1); }}
          className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm"
        >
          <option value="">Всі салони</option>
          {salons.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {salonFilter && masters.length > 0 && (
          <select
            value={masterFilter}
            onChange={(e) => { setMasterFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[#12121a] border border-white/10 rounded-lg text-white text-sm"
          >
            <option value="">Всі майстри</option>
            {masters.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
          className="w-40 bg-[#12121a] border-white/10 text-white"
          placeholder="Від"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
          className="w-40 bg-[#12121a] border-white/10 text-white"
          placeholder="До"
        />
        <Button onClick={handleSearch} className="bg-violet-600 hover:bg-violet-700">
          <Filter className="w-4 h-4 mr-2" />
          Фільтр
        </Button>
      </div>

      {/* Bookings table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Бронювань не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white">
                      {selectedIds.size === bookings.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дата/Час</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Клієнт</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Послуга</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ціна</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map((booking) => {
                  const config = statusConfig[booking.status];
                  const StatusIcon = config.icon;
                  const isSelected = selectedIds.has(booking.id);
                  
                  return (
                    <tr key={booking.id} className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-violet-500/10' : ''}`}>
                      <td className="px-4 py-4">
                        <button onClick={() => toggleSelect(booking.id)} className="text-gray-400 hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-violet-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-white font-medium">{booking.date}</p>
                            <p className="text-sm text-gray-500">{booking.time}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-white">{booking.clientName}</p>
                            <p className="text-sm text-gray-500">{booking.clientPhone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Scissors className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="text-white">{booking.serviceName || '—'}</p>
                            {booking.masterName && (
                              <p className="text-sm text-gray-500">{booking.masterName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Store className="w-4 h-4" />
                          <span className="text-sm">{booking.salon.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-white font-medium">{booking.price} ₴</span>
                      </td>
                      <td className="px-4 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${config.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {config.label}
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                            {Object.entries(statusConfig).map(([key, cfg]) => (
                              <DropdownMenuItem
                                key={key}
                                onClick={() => updateStatus(booking, key)}
                                className={`${booking.status === key ? 'bg-white/10' : ''} focus:bg-white/10`}
                              >
                                <cfg.icon className={`w-4 h-4 mr-2 ${cfg.color.split(' ')[1]}`} />
                                <span className={cfg.color.split(' ')[1]}>{cfg.label}</span>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                      <td className="px-4 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1a1a24] border-white/10">
                            <DropdownMenuItem 
                              onClick={() => handleDelete(booking)}
                              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Видалити
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
