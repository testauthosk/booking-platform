"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  LogOut,
  Store,
  Users,
  Calendar,
  Settings,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Edit2,
  Power,
  PowerOff,
  ChevronDown,
  Bell,
  BarChart3,
  TrendingUp,
  Building2,
  UserCheck,
  Ban,
  Activity,
} from 'lucide-react';

interface Salon {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_active: boolean;
  created_at: string;
  owner_id: string | null;
  users?: { email: string } | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  withOwners: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut, isSuperAdmin } = useAuth();

  const [salons, setSalons] = useState<Salon[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, withOwners: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeNav, setActiveNav] = useState('salons');

  // Redirect if not super admin
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/admin/login');
    } else if (!authLoading && user && !isSuperAdmin) {
      // Залогинен но не супер админ - в дашборд салона
      router.push('/dashboard');
    }
  }, [authLoading, user, isSuperAdmin, router]);

  // Load salons
  useEffect(() => {
    if (isSuperAdmin) {
      loadSalons();
    }
  }, [isSuperAdmin]);

  const loadSalons = async () => {
    const { data } = await supabase
      .from('salons')
      .select(`
        *,
        users!salons_owner_id_fkey (email)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setSalons(data);
      setStats({
        total: data.length,
        active: data.filter(s => s.is_active).length,
        inactive: data.filter(s => !s.is_active).length,
        withOwners: data.filter(s => s.owner_id).length,
      });
    }
    setLoading(false);
  };

  const toggleSalonActive = async (salonId: string, isActive: boolean) => {
    await supabase
      .from('salons')
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq('id', salonId);

    loadSalons();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const filteredSalons = salons.filter(salon =>
    salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    salon.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Sidebar */}
      <aside className="w-[240px] bg-white border-r border-gray-200 flex flex-col h-screen fixed">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <span className="font-semibold text-gray-900">Booking</span>
            <span className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">ADMIN</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setActiveNav('salons')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeNav === 'salons'
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Store className="w-[18px] h-[18px]" />
            <span>Салони</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              activeNav === 'salons' ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => setActiveNav('users')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeNav === 'users'
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Users className="w-[18px] h-[18px]" />
            <span>Користувачі</span>
          </button>

          <button
            onClick={() => setActiveNav('bookings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeNav === 'bookings'
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-[18px] h-[18px]" />
            <span>Бронювання</span>
          </button>

          <button
            onClick={() => setActiveNav('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeNav === 'analytics'
                ? 'bg-violet-50 text-violet-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-[18px] h-[18px]" />
            <span>Аналітика</span>
          </button>

          <div className="pt-4 mt-4 border-t border-gray-100">
            <button
              onClick={() => setActiveNav('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeNav === 'settings'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Settings className="w-[18px] h-[18px]" />
              <span>Налаштування</span>
            </button>
          </div>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
              <p className="text-xs text-gray-500">Super Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-[240px] flex-1 min-h-screen">
        {/* Top bar */}
        <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Салони</h1>
            <p className="text-sm text-gray-500">Керуйте всіма салонами платформи</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Button
              onClick={() => setShowNewModal(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-9 px-4 text-sm font-medium"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Новий салон
            </Button>
          </div>
        </div>

        <div className="p-6">
          {/* Stats cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Всього салонів</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-violet-600" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">+2</span>
                <span className="text-gray-500">за місяць</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Активних</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${stats.total ? (stats.active / stats.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Вимкнених</p>
                  <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Сайти та боти недоступні
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">З власниками</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.withOwners}</p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {stats.total - stats.withOwners} без акаунту
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Пошук салонів..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-1.5">
                  Статус
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table content */}
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Салон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Власник</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Створено</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Дії</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSalons.map((salon) => (
                  <tr key={salon.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
                          <Store className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{salon.name}</p>
                          <p className="text-sm text-gray-500">/{salon.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {salon.users?.email ? (
                        <span className="text-sm text-gray-700">{salon.users.email}</span>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Не призначено</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {salon.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          Активний
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Вимкнено
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(salon.created_at).toLocaleDateString('uk-UA')}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/salon/${salon.slug}`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Відкрити сайт"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/salon/${salon.slug}`)}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Копіювати посилання"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleSalonActive(salon.id, salon.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            salon.is_active
                              ? 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                              : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                          }`}
                          title={salon.is_active ? 'Вимкнути' : 'Увімкнути'}
                        >
                          {salon.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                        </button>
                        <button
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Редагувати"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSalons.length === 0 && (
              <div className="text-center py-12">
                <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Салони не знайдено</p>
                <p className="text-gray-400 text-sm mt-1">Спробуйте змінити параметри пошуку</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Salon Modal */}
      {showNewModal && (
        <NewSalonModal
          onClose={() => setShowNewModal(false)}
          onCreated={() => {
            setShowNewModal(false);
            loadSalons();
          }}
        />
      )}
    </div>
  );
}

// New Salon Modal Component
function NewSalonModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [type, setType] = useState('Салон краси');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яіїєґ]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const handleCreate = async () => {
    setCreating(true);

    try {
      // Create salon
      const { data: salon, error: salonError } = await supabase
        .from('salons')
        .insert({
          name,
          slug,
          type,
          description: '',
          phone: '',
          address: '',
          short_address: '',
          coordinates_lat: 0,
          coordinates_lng: 0,
          photos: [],
          working_hours: [
            { day: 'Понеділок', hours: '09:00 - 19:00' },
            { day: 'Вівторок', hours: '09:00 - 19:00' },
            { day: 'Середа', hours: '09:00 - 19:00' },
            { day: 'Четвер', hours: '09:00 - 19:00' },
            { day: "П'ятниця", hours: '09:00 - 19:00' },
            { day: 'Субота', hours: '10:00 - 17:00' },
            { day: 'Неділя', hours: 'Зачинено' },
          ],
          amenities: [],
          rating: 0,
          review_count: 0,
          is_active: true,
        })
        .select()
        .single();

      if (salonError) throw salonError;

      // Create owner account if email provided
      if (ownerEmail && ownerPassword) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: ownerEmail,
          password: ownerPassword,
        });

        if (authError) throw authError;

        if (authData.user) {
          // Create user profile
          await supabase.from('users').insert({
            id: authData.user.id,
            email: ownerEmail,
            role: 'salon_owner',
            salon_id: salon.id,
            notifications_enabled: true,
          });

          // Link salon to owner
          await supabase
            .from('salons')
            .update({ owner_id: authData.user.id })
            .eq('id', salon.id);
        }
      }

      onCreated();
    } catch (error) {
      console.error('Error creating salon:', error);
      alert('Помилка при створенні салону');
    }

    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Новий салон</h2>
            <p className="text-sm text-gray-500 mt-0.5">Крок {step} з 2</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Назва салону</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Mia Beauty Studio"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">URL (slug)</label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-gray-50 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-500">
                    /salon/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="mia-beauty-studio"
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-r-lg focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип закладу</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all bg-white"
                >
                  <option>Салон краси</option>
                  <option>Барбершоп</option>
                  <option>Перукарня</option>
                  <option>Nail-студія</option>
                  <option>SPA</option>
                  <option>Косметологія</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-violet-50 rounded-xl border border-violet-100">
                <p className="text-sm text-violet-700">
                  <strong>Опціонально:</strong> Створіть акаунт для власника салону. Він зможе редагувати інформацію та отримувати сповіщення.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email власника</label>
                <input
                  type="email"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Пароль</label>
                <input
                  type="password"
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1.5">Мінімум 6 символів</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          {step === 1 ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Скасувати
              </button>
              <Button
                onClick={() => setStep(2)}
                disabled={!name || !slug}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6"
              >
                Далі
              </Button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Назад
              </button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-6"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Створити салон
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
