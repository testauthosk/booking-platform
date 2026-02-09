'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Ban,
  CheckCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  isBlocked: boolean;
  blockReason: string | null;
  noShowCount: number;
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
  const [blockedFilter, setBlockedFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ totalAll: 0, withTelegram: 0 });
  const perPage = 50;

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    telegramChatId: '',
    isBlocked: false,
    blockReason: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClients();
  }, [page, salonFilter, telegramFilter, blockedFilter]);

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
        let filteredClients = data.clients;
        
        // Filter by blocked status (client-side for now)
        if (blockedFilter === 'true') {
          filteredClients = filteredClients.filter((c: Client) => c.isBlocked);
        } else if (blockedFilter === 'false') {
          filteredClients = filteredClients.filter((c: Client) => !c.isBlocked);
        }
        
        setClients(filteredClients);
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

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name,
      phone: client.phone,
      email: client.email || '',
      telegramChatId: client.telegramChatId || '',
      isBlocked: client.isBlocked,
      blockReason: client.blockReason || '',
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingClient) return;
    setSaving(true);

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingClient.id,
          name: editForm.name,
          phone: editForm.phone,
          email: editForm.email || null,
          telegramChatId: editForm.telegramChatId || null,
          isBlocked: editForm.isBlocked,
          blockReason: editForm.isBlocked ? editForm.blockReason : null,
        }),
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchClients();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving client:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleBlock = async (client: Client) => {
    const action = client.isBlocked ? 'розблокувати' : 'заблокувати';
    const reason = client.isBlocked ? null : prompt('Причина блокування:');
    
    if (!client.isBlocked && reason === null) return; // Cancelled

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: client.id,
          isBlocked: !client.isBlocked,
          blockReason: reason,
        }),
      });

      if (res.ok) {
        fetchClients();
      }
    } catch (error) {
      console.error('Error toggling block:', error);
    }
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
  const blockedCount = clients.filter(c => c.isBlocked).length;

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
      <div className="grid grid-cols-4 gap-4">
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
          onClick={() => { setTelegramFilter(telegramFilter === 'true' ? '' : 'true'); setPage(1); }}
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
          onClick={() => { setTelegramFilter(telegramFilter === 'false' ? '' : 'false'); setPage(1); }}
        >
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalAll - stats.withTelegram}</p>
              <p className="text-sm text-gray-500">Без Telegram</p>
            </div>
          </div>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${blockedFilter === 'true' ? 'border-red-500' : ''}`}
          onClick={() => { setBlockedFilter(blockedFilter === 'true' ? '' : 'true'); setPage(1); }}
        >
          <div className="flex items-center gap-3">
            <Ban className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-2xl font-bold text-red-400">{blockedCount}</p>
              <p className="text-sm text-gray-500">Заблоковано</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {clients.map((client) => (
                  <tr key={client.id} className={`hover:bg-white/5 transition-colors ${client.isBlocked ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-medium ${
                          client.isBlocked 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-violet-500/20 text-violet-400'
                        }`}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{client.name}</p>
                            {client.isBlocked && (
                              <Ban className="w-4 h-4 text-red-400" />
                            )}
                          </div>
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
                        {client.telegramChatId && (
                          <div className="flex items-center gap-2 text-sky-400">
                            <MessageCircle className="w-3 h-3" />
                            {client.telegramUsername || 'Telegram'}
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
                        {client.noShowCount > 0 && (
                          <span className="text-red-400 text-xs" title="No-show">
                            NS: {client.noShowCount}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {client.isBlocked ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                            <Ban className="w-3 h-3" />
                            Заблоковано
                          </span>
                          {client.blockReason && (
                            <p className="text-xs text-gray-500 mt-1 truncate max-w-[120px]" title={client.blockReason}>
                              {client.blockReason}
                            </p>
                          )}
                        </div>
                      ) : client.telegramChatId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-500/10 text-sky-400">
                          <MessageCircle className="w-3 h-3" />
                          Telegram
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
                            <DropdownMenuItem 
                              onClick={() => openEditModal(client)}
                              className="text-gray-300 focus:text-white focus:bg-white/10"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Редагувати
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleBlock(client)}
                              className={client.isBlocked 
                                ? "text-green-400 focus:text-green-400 focus:bg-green-500/10"
                                : "text-red-400 focus:text-red-400 focus:bg-red-500/10"
                              }
                            >
                              {client.isBlocked ? (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Розблокувати
                                </>
                              ) : (
                                <>
                                  <Ban className="w-4 h-4 mr-2" />
                                  Заблокувати
                                </>
                              )}
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

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Редагувати клієнта</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Ім'я</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Телефон</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Telegram Chat ID</Label>
              <Input
                value={editForm.telegramChatId}
                onChange={(e) => setEditForm({ ...editForm, telegramChatId: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isBlocked}
                  onChange={(e) => setEditForm({ ...editForm, isBlocked: e.target.checked })}
                  className="w-4 h-4 rounded border-white/10 bg-white/5 text-violet-500"
                />
                <span className="text-gray-300">Заблокувати клієнта</span>
              </label>
            </div>

            {editForm.isBlocked && (
              <div className="space-y-2">
                <Label className="text-gray-400">Причина блокування</Label>
                <Input
                  value={editForm.blockReason}
                  onChange={(e) => setEditForm({ ...editForm, blockReason: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Не з'явився 3 рази"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
              >
                Скасувати
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700"
              >
                {saving ? 'Збереження...' : 'Зберегти'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
