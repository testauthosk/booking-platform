"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  LogOut,
  Calendar,
  Settings,
  Users,
  Scissors,
  LayoutDashboard,
  Clock,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  UserCheck,
  CalendarCheck,
  ChevronRight,
  Bell,
  ExternalLink,
  Save,
  AlertTriangle,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: string;
  salon_id: string | null;
}

interface SalonData {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  short_address: string;
  photos: string[];
  working_hours: { day: string; hours: string }[];
  amenities: string[];
  rating: number;
  review_count: number;
  is_active: boolean;
}

interface BookingData {
  id: string;
  client_name: string;
  client_phone: string;
  date: string;
  time: string;
  status: string;
  service_name?: string;
  master_name?: string;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, revenue: 0 });

  // Загрузка данных при монтировании
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    // Получаем сессию
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Получаем профиль пользователя
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) {
      await supabase.auth.signOut();
      router.push('/login');
      return;
    }

    // Супер админ - в консоль
    if (profile.role === 'super_admin') {
      router.push('/admin');
      return;
    }

    setUser(profile);

    // Если есть salon_id - загружаем салон
    if (profile.salon_id) {
      await loadSalon(profile.salon_id);
      await loadBookings(profile.salon_id);
    }

    setLoading(false);
  };

  const loadSalon = async (salonId: string) => {
    const { data } = await supabase
      .from('salons')
      .select('*')
      .eq('id', salonId)
      .single();

    if (data) {
      setSalon(data);
    }
  };

  const loadBookings = async (salonId: string) => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('bookings')
      .select(`
        id, client_name, client_phone, date, time, status,
        services:service_id (name),
        masters:master_id (name)
      `)
      .eq('salon_id', salonId)
      .gte('date', today)
      .order('date', { ascending: true })
      .order('time', { ascending: true })
      .limit(10);

    if (data) {
      const formattedBookings: BookingData[] = data.map((b: any) => ({
        id: b.id,
        client_name: b.client_name,
        client_phone: b.client_phone,
        date: b.date,
        time: b.time,
        status: b.status,
        service_name: b.services?.name || undefined,
        master_name: b.masters?.name || undefined,
      }));
      setBookings(formattedBookings);
      const todayBookings = formattedBookings.filter(b => b.date === today).length;
      setStats(prev => ({ ...prev, today: todayBookings, week: formattedBookings.length }));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    );
  }

  // Салон деактивирован
  if (salon && !salon.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Аккаунт деактивирован</h1>
          <p className="text-gray-500 mb-6">
            Ваш салон временно отключен администратором. Свяжитесь с поддержкой для восстановления доступа.
          </p>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  // Нет привязанного салона
  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Нет привязанного салона</h1>
          <p className="text-gray-500 mb-6">
            К вашему аккаунту не привязан салон. Обратитесь к администратору.
          </p>
          <Button onClick={handleSignOut} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { id: 'bookings', label: 'Записи', icon: Calendar },
    { id: 'services', label: 'Услуги', icon: Scissors },
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Salon name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold">B</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-900">{salon.name}</h1>
                <p className="text-xs text-gray-500">{salon.type}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <a
                href={`/salon/${salon.slug}`}
                target="_blank"
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть сайт
              </a>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Записей сегодня</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.today}</p>
                  </div>
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
                    <CalendarCheck className="w-6 h-6 text-violet-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">На этой неделе</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats.week}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Рейтинг</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{salon.rating || '—'}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <UserCheck className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Отзывов</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{salon.review_count || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming bookings */}
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900">Ближайшие записи</h2>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    Все записи
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {bookings.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {bookings.slice(0, 5).map(booking => (
                    <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-violet-100 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-xs text-violet-600 font-medium">
                              {new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-violet-500 uppercase">
                              {new Date(booking.date).toLocaleDateString('ru-RU', { month: 'short' })}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{booking.client_name}</p>
                            <p className="text-sm text-gray-500">
                              {booking.time} • {booking.service_name || 'Услуга'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {booking.status === 'confirmed' ? 'Подтверждено' :
                           booking.status === 'pending' ? 'Ожидает' : booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Нет предстоящих записей</p>
                </div>
              )}
            </div>

            {/* Quick info */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Контактная информация</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{salon.phone || 'Не указан'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{salon.email || 'Не указан'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">{salon.address || 'Не указан'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Часы работы</h3>
                <div className="space-y-2">
                  {(salon.working_hours || []).slice(0, 4).map((wh, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{wh.day}</span>
                      <span className="text-gray-900 font-medium">{wh.hours}</span>
                    </div>
                  ))}
                  {(!salon.working_hours || salon.working_hours.length === 0) && (
                    <p className="text-gray-400 text-sm">Не указаны</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Все записи</h2>
            </div>
            {bookings.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {bookings.map(booking => (
                  <div key={booking.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-100 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-xs text-violet-600 font-medium">
                            {new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric' })}
                          </span>
                          <span className="text-[10px] text-violet-500 uppercase">
                            {new Date(booking.date).toLocaleDateString('ru-RU', { month: 'short' })}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{booking.client_name}</p>
                          <p className="text-sm text-gray-500">
                            {booking.time} • {booking.service_name || 'Услуга'} • {booking.master_name || 'Мастер'}
                          </p>
                          <p className="text-sm text-gray-400">{booking.client_phone}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {booking.status === 'confirmed' ? 'Подтверждено' :
                         booking.status === 'pending' ? 'Ожидает' : booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Нет записей</p>
              </div>
            )}
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Управление услугами скоро будет доступно</p>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Управление командой скоро будет доступно</p>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <SettingsTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
        )}
      </main>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: salon.name,
    type: salon.type,
    description: salon.description || '',
    phone: salon.phone || '',
    email: salon.email || '',
    address: salon.address || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('salons')
      .update({ ...formData, updated_at: new Date().toISOString() })
      .eq('id', salon.id);

    if (!error) {
      onUpdate(formData);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Основная информация</h2>

        <div className="grid gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Название салона</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип заведения</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none bg-white"
            >
              <option>Салон красоты</option>
              <option>Барбершоп</option>
              <option>Парикмахерская</option>
              <option>Nail-студия</option>
              <option>SPA</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Контакты</h2>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Адрес</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Сохранить изменения
        </Button>
      </div>
    </div>
  );
}
