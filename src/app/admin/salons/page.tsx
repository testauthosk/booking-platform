'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  LogIn,
  Trash2,
  Check,
  X,
  Crown,
  ChevronLeft,
  ChevronRight,
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

interface Salon {
  id: string;
  name: string;
  slug: string;
  type: string;
  isActive: boolean;
  address: string | null;
  phone: string | null;
  createdAt: string;
  ownerId: string | null;
  owner?: { id: string; email: string; name: string | null } | null;
  subscription?: { plan: string; status: string } | null;
  _count?: {
    masters: number;
    bookings: number;
    clients: number;
  };
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-500/10 text-gray-400',
  pro: 'bg-violet-500/10 text-violet-400',
  business: 'bg-amber-500/10 text-amber-400',
};

export default function SalonsPage() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const perPage = 50;

  // Edit modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSalon, setEditingSalon] = useState<Salon | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    address: '',
    phone: '',
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<Salon | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      const res = await fetch(`/api/admin/salons/${salon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !salon.isActive }),
      });
      if (res.ok) {
        fetchSalons();
      }
    } catch (error) {
      console.error('Error toggling salon:', error);
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/salon/${slug}`);
  };

  const impersonate = async (ownerId: string) => {
    if (!confirm('Увійти як власник цього салону?')) return;

    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: ownerId }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message);
        window.location.href = '/dashboard';
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка');
      }
    } catch (error) {
      console.error('Error impersonating:', error);
    }
  };

  const openEditModal = (salon: Salon) => {
    setEditingSalon(salon);
    setEditForm({
      name: salon.name,
      slug: salon.slug,
      address: salon.address || '',
      phone: salon.phone || '',
    });
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSalon) return;
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/salons/${editingSalon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditModalOpen(false);
        fetchSalons();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving salon:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/salons/${deleteConfirm.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteConfirm(null);
        fetchSalons();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка видалення');
      }
    } catch (error) {
      console.error('Error deleting salon:', error);
    } finally {
      setDeleting(false);
    }
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

  const paginatedSalons = filteredSalons.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filteredSalons.length / perPage);

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
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${filter === 'inactive' ? 'border-red-500' : ''}`}
          onClick={() => { setFilter('inactive'); setPage(1); }}
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
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
        />
      </div>

      {/* Table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : paginatedSalons.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Салонів не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Власник</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">План</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статистика</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Створено</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedSalons.map((salon) => (
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
                      {salon.subscription ? (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${PLAN_COLORS[salon.subscription.plan] || PLAN_COLORS.free}`}>
                          <Crown className="w-3 h-3" />
                          {salon.subscription.plan.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
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
                      <span className="text-sm text-gray-500">
                        {new Date(salon.createdAt).toLocaleDateString('uk-UA')}
                      </span>
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
                            {salon.owner && (
                              <DropdownMenuItem 
                                onClick={() => impersonate(salon.owner!.id)}
                                className="text-gray-300 focus:text-white focus:bg-white/10"
                              >
                                <LogIn className="w-4 h-4 mr-2" />
                                Увійти як власник
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => openEditModal(salon)}
                              className="text-gray-300 focus:text-white focus:bg-white/10"
                            >
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
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => setDeleteConfirm(salon)}
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
                  Показано {(page - 1) * perPage + 1}-{Math.min(page * perPage, filteredSalons.length)} з {filteredSalons.length}
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
            <DialogTitle>Редагувати салон</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-gray-400">Назва</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Slug (URL)</Label>
              <Input
                value={editForm.slug}
                onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400">Адреса</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Видалити салон?</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <p className="text-gray-300">
              Ви впевнені, що хочете видалити салон <strong className="text-white">{deleteConfirm?.name}</strong>?
            </p>
            <p className="text-sm text-red-400/80">
              Ця дія незворотня. Всі дані салону (бронювання, клієнти, майстри) будуть видалені.
            </p>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
              >
                Скасувати
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {deleting ? 'Видалення...' : 'Видалити'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
