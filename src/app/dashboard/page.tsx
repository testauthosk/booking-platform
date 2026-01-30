"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/dashboard/Sidebar';
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
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Upload,
  Image,
  Star,
  Store,
  BarChart3,
  UserCircle,
  X,
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
  logo_url: string;
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
  client_email: string;
  date: string;
  time: string;
  status: string;
  service_name?: string;
  master_name?: string;
  price?: number;
}

interface ServiceData {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  is_active: boolean;
}

interface MasterData {
  id: string;
  name: string;
  position: string;
  photo_url: string;
  phone: string;
  email: string;
  is_active: boolean;
}

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    revenue: 0,
    clients: 0,
    avgRating: 0
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      router.push('/login');
      return;
    }

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

    if (profile.role === 'super_admin') {
      router.push('/admin');
      return;
    }

    setUser(profile);

    if (profile.salon_id) {
      await Promise.all([
        loadSalon(profile.salon_id),
        loadBookings(profile.salon_id),
        loadServices(profile.salon_id),
        loadMasters(profile.salon_id),
      ]);
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
      .select('*')
      .eq('salon_id', salonId)
      .order('date', { ascending: false })
      .limit(50);

    if (data) {
      setBookings(data);
      const todayBookings = data.filter(b => b.date === today).length;
      const weekBookings = data.filter(b => {
        const bookingDate = new Date(b.date);
        const now = new Date();
        const weekAgo = new Date(now.setDate(now.getDate() - 7));
        return bookingDate >= weekAgo;
      }).length;
      setStats(prev => ({ ...prev, today: todayBookings, week: weekBookings }));
    }
  };

  const loadServices = async (salonId: string) => {
    const { data } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', salonId)
      .order('name');

    if (data) {
      setServices(data);
    }
  };

  const loadMasters = async (salonId: string) => {
    const { data } = await supabase
      .from('masters')
      .select('*')
      .eq('salon_id', salonId)
      .order('name');

    if (data) {
      setMasters(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (salon && !salon.is_active) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Аккаунт деактивирован</h1>
          <p className="text-gray-500 mb-8">
            Ваш салон временно отключен администратором. Свяжитесь с поддержкой для восстановления доступа.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Нет привязанного салона</h1>
          <p className="text-gray-500 mb-8">
            К вашему аккаунту не привязан салон. Обратитесь к администратору платформы.
          </p>
          <Button onClick={handleSignOut} variant="outline" className="rounded-xl">
            <LogOut className="w-4 h-4 mr-2" />
            Выйти
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar
        salonName={salon.name}
        salonType={salon.type}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {activeTab === 'overview' && 'Обзор'}
                {activeTab === 'bookings' && 'Записи'}
                {activeTab === 'services' && 'Услуги'}
                {activeTab === 'team' && 'Команда'}
                {activeTab === 'clients' && 'Клиенты'}
                {activeTab === 'analytics' && 'Аналитика'}
                {activeTab === 'profile' && 'Профиль салона'}
                {activeTab === 'photos' && 'Фото и медиа'}
                {activeTab === 'schedule' && 'Расписание'}
                {activeTab === 'reviews' && 'Отзывы'}
                {activeTab === 'notifications' && 'Уведомления'}
                {activeTab === 'settings' && 'Настройки'}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">{salon.name}</p>
            </div>

            <div className="flex items-center gap-3">
              <a
                href={`/s/${salon.slug}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть сайт
              </a>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <OverviewTab salon={salon} bookings={bookings} stats={stats} onViewAll={() => setActiveTab('bookings')} />
          )}

          {/* Bookings Tab */}
          {activeTab === 'bookings' && (
            <BookingsTab bookings={bookings} />
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <ServicesTab services={services} salonId={salon.id} onReload={() => loadServices(salon.id)} />
          )}

          {/* Team Tab */}
          {activeTab === 'team' && (
            <TeamTab masters={masters} salonId={salon.id} onReload={() => loadMasters(salon.id)} />
          )}

          {/* Clients Tab */}
          {activeTab === 'clients' && (
            <PlaceholderTab icon={UserCircle} title="Клиенты" description="База клиентов скоро будет доступна" />
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <PlaceholderTab icon={BarChart3} title="Аналитика" description="Аналитика и отчёты скоро будут доступны" />
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <ProfileTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}

          {/* Photos Tab */}
          {activeTab === 'photos' && (
            <PhotosTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <ScheduleTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <PlaceholderTab icon={Star} title="Отзывы" description="Управление отзывами скоро будет доступно" />
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <PlaceholderTab icon={Bell} title="Уведомления" description="Настройка уведомлений скоро будет доступна" />
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <PlaceholderTab icon={Settings} title="Настройки" description="Дополнительные настройки скоро будут доступны" />
          )}
        </div>
      </main>
    </div>
  );
}

// ===================== TAB COMPONENTS =====================

function OverviewTab({ salon, bookings, stats, onViewAll }: { salon: SalonData; bookings: BookingData[]; stats: any; onViewAll: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Записей сегодня"
          value={stats.today}
          icon={CalendarCheck}
          color="violet"
        />
        <StatCard
          title="За неделю"
          value={stats.week}
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Рейтинг"
          value={salon.rating || '—'}
          icon={Star}
          color="yellow"
        />
        <StatCard
          title="Отзывов"
          value={salon.review_count || 0}
          icon={UserCheck}
          color="green"
        />
      </div>

      {/* Today's Bookings */}
      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Записи на сегодня</h2>
          <button
            onClick={onViewAll}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
          >
            Все записи
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {todayBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {todayBookings.slice(0, 5).map(booking => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет записей на сегодня</p>
          </div>
        )}
      </div>

      {/* Quick Info */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Контактная информация</h3>
          <div className="space-y-3">
            <InfoRow icon={Phone} label="Телефон" value={salon.phone || 'Не указан'} />
            <InfoRow icon={Mail} label="Email" value={salon.email || 'Не указан'} />
            <InfoRow icon={MapPin} label="Адрес" value={salon.address || 'Не указан'} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Часы работы</h3>
          <div className="space-y-2">
            {(salon.working_hours || []).slice(0, 5).map((wh, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{wh.day}</span>
                <span className="text-gray-900 font-medium">{wh.hours}</span>
              </div>
            ))}
            {(!salon.working_hours || salon.working_hours.length === 0) && (
              <p className="text-gray-400 text-sm">Расписание не настроено</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ bookings }: { bookings: BookingData[] }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filteredBookings = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search && !b.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени клиента..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-violet-500"
        >
          <option value="all">Все статусы</option>
          <option value="confirmed">Подтверждено</option>
          <option value="pending">Ожидает</option>
          <option value="completed">Завершено</option>
          <option value="cancelled">Отменено</option>
        </select>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Новая запись
        </Button>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {filteredBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} showActions />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Записи не найдены</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ServicesTab({ services, salonId, onReload }: { services: ServiceData[]; salonId: string; onReload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{services.length} услуг</p>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Добавить услугу
        </Button>
      </div>

      {services.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(service => (
            <div key={service.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-violet-600" />
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{service.description || 'Без описания'}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{service.duration} мин</span>
                <span className="font-semibold text-gray-900">{service.price} ₴</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Услуги ещё не добавлены</p>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Добавить первую услугу
          </Button>
        </div>
      )}
    </div>
  );
}

function TeamTab({ masters, salonId, onReload }: { masters: MasterData[]; salonId: string; onReload: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{masters.length} мастеров</p>
        <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Добавить мастера
        </Button>
      </div>

      {masters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map(master => (
            <div key={master.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                  {master.photo_url ? (
                    <img src={master.photo_url} alt={master.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{master.name}</h3>
                  <p className="text-sm text-gray-500">{master.position || 'Мастер'}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span>{master.phone || 'Не указан'}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span>{master.email || 'Не указан'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Мастера ещё не добавлены</p>
          <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Добавить первого мастера
          </Button>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
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
    <div className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Основная информация</h2>
        <div className="space-y-5">
          <FormField label="Название салона">
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </FormField>

          <FormField label="Тип заведения">
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="form-input"
            >
              <option>Салон красоты</option>
              <option>Барбершоп</option>
              <option>Парикмахерская</option>
              <option>Nail-студия</option>
              <option>SPA</option>
            </select>
          </FormField>

          <FormField label="Описание">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="form-input resize-none"
            />
          </FormField>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Контакты</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <FormField label="Телефон">
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input"
            />
          </FormField>

          <FormField label="Email">
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
            />
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Адрес">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="form-input"
              />
            </FormField>
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

function PhotosTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Логотип</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden">
            {salon.logo_url ? (
              <img src={salon.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Image className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <Button variant="outline" className="rounded-lg mb-2">
              <Upload className="w-4 h-4 mr-2" />
              Загрузить логотип
            </Button>
            <p className="text-xs text-gray-500">PNG, JPG до 2MB. Рекомендуемый размер 200x200px</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Фотографии салона</h2>
          <Button variant="outline" className="rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Добавить фото
          </Button>
        </div>

        {(salon.photos || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {salon.photos.map((photo, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Фотографии ещё не добавлены</p>
            <Button variant="outline" className="rounded-lg">
              <Upload className="w-4 h-4 mr-2" />
              Загрузить фотографии
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Часы работы</h2>
        <div className="space-y-4">
          {days.map((day, i) => {
            const existing = (salon.working_hours || []).find(wh => wh.day === day);
            return (
              <div key={day} className="flex items-center gap-4">
                <span className="w-32 text-sm font-medium text-gray-700">{day}</span>
                <input
                  type="text"
                  defaultValue={existing?.hours || ''}
                  placeholder="09:00 - 20:00 или Выходной"
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex justify-end">
          <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6">
            <Save className="w-4 h-4 mr-2" />
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlaceholderTab({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <Icon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">{description}</p>
    </div>
  );
}

// ===================== HELPER COMPONENTS =====================

function StatCard({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  const colors: Record<string, { bg: string; icon: string }> = {
    violet: { bg: 'bg-violet-100', icon: 'text-violet-600' },
    blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
    yellow: { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
    green: { bg: 'bg-green-100', icon: 'text-green-600' },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${colors[color].bg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${colors[color].icon}`} />
        </div>
      </div>
    </div>
  );
}

function BookingRow({ booking, showActions }: { booking: BookingData; showActions?: boolean }) {
  const statusStyles: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
  };

  const statusLabels: Record<string, string> = {
    confirmed: 'Подтверждено',
    pending: 'Ожидает',
    completed: 'Завершено',
    cancelled: 'Отменено',
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
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
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[booking.status] || 'bg-gray-100 text-gray-700'}`}>
          {statusLabels[booking.status] || booking.status}
        </span>
        {showActions && (
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-gray-600">{value}</span>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
