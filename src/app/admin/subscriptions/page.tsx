'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CreditCard,
  Search,
  Store,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Crown,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Subscription {
  id: string;
  salonId: string;
  plan: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  salon: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    createdAt: string;
    owner?: { email: string; name: string | null } | null;
  };
}

const PLAN_CONFIG: Record<string, { label: string; color: string; icon: typeof Crown; price: number }> = {
  free: { label: 'Free', color: 'bg-gray-500/10 text-gray-400', icon: Sparkles, price: 0 },
  pro: { label: 'Pro', color: 'bg-violet-500/10 text-violet-400', icon: Crown, price: 299 },
  business: { label: 'Business', color: 'bg-amber-500/10 text-amber-400', icon: TrendingUp, price: 599 },
};

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    free: 0,
    pro: 0,
    business: 0,
    active: 0,
    mrr: 0,
    salonsWithoutSubscription: 0,
  });

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [formData, setFormData] = useState({
    plan: 'free',
    status: 'active',
    currentPeriodStart: '',
    currentPeriodEnd: '',
  });

  const perPage = 50;

  useEffect(() => {
    fetchSubscriptions();
  }, [page, planFilter]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: perPage.toString(),
      });
      if (search) params.set('search', search);
      if (planFilter) params.set('plan', planFilter);

      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
        setTotal(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchSubscriptions();
  };

  const openEditModal = (sub: Subscription) => {
    setEditingSub(sub);
    setFormData({
      plan: sub.plan,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart?.split('T')[0] || '',
      currentPeriodEnd: sub.currentPeriodEnd?.split('T')[0] || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingSub) return;

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSub.id,
          ...formData,
        }),
      });

      if (res.ok) {
        setModalOpen(false);
        fetchSubscriptions();
      } else {
        const error = await res.json();
        alert(error.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('Помилка збереження');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Підписки</h1>
        <p className="text-gray-400 text-sm">Управління планами підписок салонів</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-6 gap-4">
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${planFilter === '' ? 'border-violet-500' : ''}`}
          onClick={() => { setPlanFilter(''); setPage(1); }}
        >
          <p className="text-2xl font-bold text-white">{stats.free + stats.pro + stats.business}</p>
          <p className="text-sm text-gray-500">Всього</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${planFilter === 'free' ? 'border-gray-500' : ''}`}
          onClick={() => { setPlanFilter(planFilter === 'free' ? '' : 'free'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-gray-400">{stats.free}</p>
          <p className="text-sm text-gray-500">Free</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${planFilter === 'pro' ? 'border-violet-500' : ''}`}
          onClick={() => { setPlanFilter(planFilter === 'pro' ? '' : 'pro'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-violet-400">{stats.pro}</p>
          <p className="text-sm text-gray-500">Pro</p>
        </Card>
        <Card 
          className={`bg-[#12121a] border-white/5 p-4 cursor-pointer transition-colors ${planFilter === 'business' ? 'border-amber-500' : ''}`}
          onClick={() => { setPlanFilter(planFilter === 'business' ? '' : 'business'); setPage(1); }}
        >
          <p className="text-2xl font-bold text-amber-400">{stats.business}</p>
          <p className="text-sm text-gray-500">Business</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <p className="text-2xl font-bold text-green-400">{stats.mrr.toLocaleString()} ₴</p>
          </div>
          <p className="text-sm text-gray-500">MRR</p>
        </Card>
        <Card className="bg-[#12121a] border-white/5 p-4">
          <p className="text-2xl font-bold text-red-400">{stats.salonsWithoutSubscription}</p>
          <p className="text-sm text-gray-500">Без підписки</p>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Пошук по назві салону..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9 bg-[#12121a] border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button onClick={handleSearch} className="bg-violet-600 hover:bg-violet-700">
          Шукати
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-[#12121a] border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Завантаження...</div>
        ) : subscriptions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Підписок не знайдено</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Салон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Власник</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">План</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Період</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subscriptions.map((sub) => {
                  const planConfig = PLAN_CONFIG[sub.plan] || PLAN_CONFIG.free;
                  const PlanIcon = planConfig.icon;
                  
                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                            <Store className="w-5 h-5 text-violet-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">{sub.salon.name}</p>
                            <p className="text-sm text-gray-500">/{sub.salon.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {sub.salon.owner ? (
                          <p className="text-sm text-gray-400">{sub.salon.owner.email}</p>
                        ) : (
                          <span className="text-sm text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${planConfig.color}`}>
                          <PlanIcon className="w-3 h-3" />
                          {planConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {sub.status === 'active' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
                            <Check className="w-3 h-3" />
                            Активна
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                            <X className="w-3 h-3" />
                            {sub.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-400">
                          {sub.currentPeriodStart && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(sub.currentPeriodStart).toLocaleDateString('uk-UA')}
                              {sub.currentPeriodEnd && (
                                <span> — {new Date(sub.currentPeriodEnd).toLocaleDateString('uk-UA')}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(sub)}
                          className="bg-transparent border-white/10 text-white hover:bg-white/5"
                        >
                          Змінити план
                        </Button>
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

      {/* Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#12121a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Змінити підписку</DialogTitle>
          </DialogHeader>

          {editingSub && (
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-gray-400">Салон</p>
                <p className="font-medium text-white">{editingSub.salon.name}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">План</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['free', 'pro', 'business'] as const).map((plan) => {
                    const config = PLAN_CONFIG[plan];
                    const Icon = config.icon;
                    return (
                      <button
                        key={plan}
                        onClick={() => setFormData({ ...formData, plan })}
                        className={`p-3 rounded-lg border transition-colors ${
                          formData.plan === plan
                            ? 'border-violet-500 bg-violet-500/10'
                            : 'border-white/10 hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${formData.plan === plan ? 'text-violet-400' : 'text-gray-500'}`} />
                        <p className="text-sm font-medium text-white">{config.label}</p>
                        <p className="text-xs text-gray-500">{config.price} ₴/міс</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400">Статус</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  <option value="active">Активна</option>
                  <option value="cancelled">Скасована</option>
                  <option value="past_due">Прострочена</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-400">Початок</Label>
                  <Input
                    type="date"
                    value={formData.currentPeriodStart}
                    onChange={(e) => setFormData({ ...formData, currentPeriodStart: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400">Кінець</Label>
                  <Input
                    type="date"
                    value={formData.currentPeriodEnd}
                    onChange={(e) => setFormData({ ...formData, currentPeriodEnd: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 bg-transparent border-white/10 text-white hover:bg-white/5"
                >
                  Скасувати
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  Зберегти
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
