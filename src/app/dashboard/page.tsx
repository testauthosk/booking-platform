"use client";

import { useState, useEffect, useRef } from 'react';
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
  Check,
} from 'lucide-react';

// ===================== INTERFACES =====================

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
  working_hours: WorkingHour[];
  amenities: string[];
  rating: number;
  review_count: number;
  is_active: boolean;
}

interface WorkingHour {
  day: string;
  is_working: boolean;
  open: string;
  close: string;
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

// ===================== MAIN COMPONENT =====================

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
      // Ensure working_hours has proper format
      const defaultHours: WorkingHour[] = [
        { day: 'Понедельник', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Вторник', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Среда', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Четверг', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Пятница', is_working: true, open: '09:00', close: '20:00' },
        { day: 'Суббота', is_working: true, open: '10:00', close: '18:00' },
        { day: 'Воскресенье', is_working: false, open: '10:00', close: '18:00' },
      ];

      setSalon({
        ...data,
        working_hours: data.working_hours?.length ? data.working_hours : defaultHours,
        photos: data.photos || [],
      });
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
          {activeTab === 'overview' && (
            <OverviewTab salon={salon} bookings={bookings} stats={stats} onViewAll={() => setActiveTab('bookings')} />
          )}
          {activeTab === 'bookings' && (
            <BookingsTab
              bookings={bookings}
              salonId={salon.id}
              services={services}
              masters={masters}
              onReload={() => loadBookings(salon.id)}
            />
          )}
          {activeTab === 'services' && (
            <ServicesTab services={services} salonId={salon.id} onReload={() => loadServices(salon.id)} />
          )}
          {activeTab === 'team' && (
            <TeamTab masters={masters} salonId={salon.id} onReload={() => loadMasters(salon.id)} />
          )}
          {activeTab === 'clients' && (
            <PlaceholderTab icon={UserCircle} title="Клиенты" description="База клиентов скоро будет доступна" />
          )}
          {activeTab === 'analytics' && (
            <PlaceholderTab icon={BarChart3} title="Аналитика" description="Аналитика и отчёты скоро будут доступны" />
          )}
          {activeTab === 'profile' && (
            <ProfileTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}
          {activeTab === 'photos' && (
            <PhotosTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}
          {activeTab === 'schedule' && (
            <ScheduleTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
          )}
          {activeTab === 'reviews' && (
            <PlaceholderTab icon={Star} title="Отзывы" description="Управление отзывами скоро будет доступно" />
          )}
          {activeTab === 'notifications' && (
            <PlaceholderTab icon={Bell} title="Уведомления" description="Настройка уведомлений скоро будет доступна" />
          )}
          {activeTab === 'settings' && (
            <PlaceholderTab icon={Settings} title="Настройки" description="Дополнительные настройки скоро будут доступны" />
          )}
        </div>
      </main>
    </div>
  );
}

// ===================== OVERVIEW TAB =====================

function OverviewTab({ salon, bookings, stats, onViewAll }: { salon: SalonData; bookings: BookingData[]; stats: any; onViewAll: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Записей сегодня" value={stats.today} icon={CalendarCheck} color="violet" />
        <StatCard title="За неделю" value={stats.week} icon={TrendingUp} color="blue" />
        <StatCard title="Рейтинг" value={salon.rating || '—'} icon={Star} color="yellow" />
        <StatCard title="Отзывов" value={salon.review_count || 0} icon={UserCheck} color="green" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Записи на сегодня</h2>
          <button onClick={onViewAll} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Все записи <ChevronRight className="w-4 h-4" />
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
            {(salon.working_hours || []).map((wh, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{wh.day}</span>
                <span className={`font-medium ${wh.is_working ? 'text-gray-900' : 'text-red-500'}`}>
                  {wh.is_working ? `${wh.open} - ${wh.close}` : 'Выходной'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== BOOKINGS TAB =====================

function BookingsTab({ bookings, salonId, services, masters, onReload }: {
  bookings: BookingData[];
  salonId: string;
  services: ServiceData[];
  masters: MasterData[];
  onReload: () => void;
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const filteredBookings = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false;
    if (search && !b.client_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
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
        <Button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Новая запись
        </Button>
      </div>

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

      {showModal && (
        <QuickBookingModal
          salonId={salonId}
          services={services}
          masters={masters}
          onClose={() => setShowModal(false)}
          onSave={onReload}
        />
      )}
    </div>
  );
}

// Быстрая модалка создания записи - максимально простая
function QuickBookingModal({ salonId, services, masters, onClose, onSave }: {
  salonId: string;
  services: ServiceData[];
  masters: MasterData[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_name: '',
    client_phone: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    service_id: services[0]?.id || '',
    master_id: masters[0]?.id || '',
  });

  // Генерируем слоты времени
  const timeSlots: string[] = [];
  for (let h = 8; h <= 21; h++) {
    timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
    timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name || !form.client_phone) return;

    setSaving(true);

    const selectedService = services.find(s => s.id === form.service_id);
    const selectedMaster = masters.find(m => m.id === form.master_id);

    await supabase.from('bookings').insert({
      salon_id: salonId,
      client_name: form.client_name,
      client_phone: form.client_phone,
      client_email: '',
      date: form.date,
      time: form.time,
      service_id: form.service_id || null,
      service_name: selectedService?.name || '',
      master_id: form.master_id || null,
      master_name: selectedMaster?.name || '',
      price: selectedService?.price || 0,
      status: 'confirmed',
    });

    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Быстрая запись</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Имя и телефон в одной строке */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Имя клиента *</label>
              <input
                type="text"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                placeholder="Имя"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Телефон *</label>
              <input
                type="tel"
                value={form.client_phone}
                onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                required
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                placeholder="+380..."
              />
            </div>
          </div>

          {/* Дата и время */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Дата</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Время</label>
              <select
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
              >
                {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Услуга и мастер */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Услуга</label>
              <select
                value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
              >
                <option value="">Не выбрана</option>
                {services.map(s => (
                  <option key={s.id} value={s.id}>{s.name} - {s.price}₴</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Мастер</label>
              <select
                value={form.master_id}
                onChange={(e) => setForm({ ...form, master_id: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
              >
                <option value="">Любой</option>
                {masters.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={saving || !form.client_name || !form.client_phone}
              className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
              Записать
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== SERVICES TAB =====================

function ServicesTab({ services, salonId, onReload }: { services: ServiceData[]; salonId: string; onReload: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleEdit = (service: ServiceData) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту услугу?')) return;
    setDeleting(id);
    await supabase.from('services').delete().eq('id', id);
    onReload();
    setDeleting(null);
  };

  const handleSave = async (data: Partial<ServiceData>) => {
    if (editingService) {
      await supabase.from('services').update(data).eq('id', editingService.id);
    } else {
      await supabase.from('services').insert({ ...data, salon_id: salonId, is_active: true });
    }
    setShowModal(false);
    setEditingService(null);
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{services.length} услуг</p>
        <Button onClick={() => { setEditingService(null); setShowModal(true); }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
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
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(service)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    disabled={deleting === service.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    {deleting === service.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
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
          <Button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Добавить первую услугу
          </Button>
        </div>
      )}

      {showModal && (
        <ServiceModal
          service={editingService}
          onClose={() => { setShowModal(false); setEditingService(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, onClose, onSave }: { service: ServiceData | null; onClose: () => void; onSave: (data: Partial<ServiceData>) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 30,
    category: service?.category || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{service ? 'Редактировать услугу' : 'Новая услуга'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="form-input"
              placeholder="Например: Стрижка мужская"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="form-input resize-none"
              placeholder="Краткое описание услуги"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Цена (₴)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                required
                min="0"
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность (мин)</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="form-input"
              >
                <option value={15}>15 минут</option>
                <option value={30}>30 минут</option>
                <option value={45}>45 минут</option>
                <option value={60}>1 час</option>
                <option value={90}>1.5 часа</option>
                <option value={120}>2 часа</option>
                <option value={180}>3 часа</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="form-input"
              placeholder="Например: Стрижки"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Отмена
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : service ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== TEAM TAB =====================

function TeamTab({ masters, salonId, onReload }: { masters: MasterData[]; salonId: string; onReload: () => void }) {
  const [showModal, setShowModal] = useState(false);
  const [editingMaster, setEditingMaster] = useState<MasterData | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleEdit = (master: MasterData) => {
    setEditingMaster(master);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этого мастера?')) return;
    setDeleting(id);
    await supabase.from('masters').delete().eq('id', id);
    onReload();
    setDeleting(null);
  };

  const handleSave = async (data: Partial<MasterData>) => {
    if (editingMaster) {
      await supabase.from('masters').update(data).eq('id', editingMaster.id);
    } else {
      await supabase.from('masters').insert({ ...data, salon_id: salonId, is_active: true });
    }
    setShowModal(false);
    setEditingMaster(null);
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{masters.length} мастеров</p>
        <Button onClick={() => { setEditingMaster(null); setShowModal(true); }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Добавить мастера
        </Button>
      </div>

      {masters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map(master => (
            <div key={master.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
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
                <div className="flex items-center gap-1">
                  <button onClick={() => handleEdit(master)} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(master.id)}
                    disabled={deleting === master.id}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    {deleting === master.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
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
          <Button onClick={() => setShowModal(true)} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Добавить первого мастера
          </Button>
        </div>
      )}

      {showModal && (
        <MasterModal
          master={editingMaster}
          onClose={() => { setShowModal(false); setEditingMaster(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function MasterModal({ master, onClose, onSave }: { master: MasterData | null; onClose: () => void; onSave: (data: Partial<MasterData>) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: master?.name || '',
    position: master?.position || '',
    phone: master?.phone || '',
    email: master?.email || '',
    photo_url: master?.photo_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{master ? 'Редактировать мастера' : 'Новый мастер'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="form-input"
              placeholder="Полное имя"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Должность</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="form-input"
              placeholder="Например: Парикмахер-стилист"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="form-input"
                placeholder="+380..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="form-input"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Отмена
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : master ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== PROFILE TAB =====================

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

// ===================== PHOTOS TAB =====================

function PhotosTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const [uploading, setUploading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error } = await supabase.storage.from('salon-media').upload(filePath, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('salon-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadFile(file, `logos/${salon.id}`);
    if (url) {
      await supabase.from('salons').update({ logo_url: url }).eq('id', salon.id);
      onUpdate({ logo_url: url });
    }
    setUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handlePhotosUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setUploading(true);
    const newPhotos: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadFile(file, `photos/${salon.id}`);
      if (url) newPhotos.push(url);
    }

    if (newPhotos.length > 0) {
      const updatedPhotos = [...(salon.photos || []), ...newPhotos];
      await supabase.from('salons').update({ photos: updatedPhotos }).eq('id', salon.id);
      onUpdate({ photos: updatedPhotos });
    }
    setUploading(false);
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const handleDeletePhoto = async (index: number) => {
    setDeletingPhoto(index);
    const updatedPhotos = salon.photos.filter((_, i) => i !== index);
    await supabase.from('salons').update({ photos: updatedPhotos }).eq('id', salon.id);
    onUpdate({ photos: updatedPhotos });
    setDeletingPhoto(null);
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Удалить логотип?')) return;
    await supabase.from('salons').update({ logo_url: null }).eq('id', salon.id);
    onUpdate({ logo_url: '' });
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Логотип</h2>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden relative group">
            {salon.logo_url ? (
              <>
                <img src={salon.logo_url} alt="Logo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button onClick={handleDeleteLogo} className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <Image className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg mb-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
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
          <input
            ref={photosInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => photosInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg"
          >
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Добавить фото
          </Button>
        </div>

        {(salon.photos || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {salon.photos.map((photo, i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative group">
                <img src={photo} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <a href={photo} target="_blank" className="p-2 bg-white rounded-lg text-gray-700 hover:bg-gray-100">
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDeletePhoto(i)}
                    disabled={deletingPhoto === i}
                    className="p-2 bg-white rounded-lg text-red-600 hover:bg-red-50"
                  >
                    {deletingPhoto === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Фотографии ещё не добавлены</p>
            <Button
              variant="outline"
              onClick={() => photosInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Загрузить фотографии
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== SCHEDULE TAB =====================

function ScheduleTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<WorkingHour[]>(
    salon.working_hours?.length ? salon.working_hours : [
      { day: 'Понедельник', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Вторник', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Среда', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Четверг', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Пятница', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Суббота', is_working: true, open: '10:00', close: '18:00' },
      { day: 'Воскресенье', is_working: false, open: '10:00', close: '18:00' },
    ]
  );

  const timeOptions: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  const updateDay = (index: number, updates: Partial<WorkingHour>) => {
    const newSchedule = [...schedule];
    newSchedule[index] = { ...newSchedule[index], ...updates };
    setSchedule(newSchedule);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('salons')
      .update({ working_hours: schedule, updated_at: new Date().toISOString() })
      .eq('id', salon.id);

    if (!error) {
      onUpdate({ working_hours: schedule });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-6">Часы работы</h2>
        <div className="space-y-4">
          {schedule.map((day, i) => (
            <div key={day.day} className="flex items-center gap-4 py-2">
              <div className="w-32">
                <span className="text-sm font-medium text-gray-700">{day.day}</span>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => updateDay(i, { is_working: !day.is_working })}
                  className={`w-10 h-6 rounded-full transition-colors relative ${day.is_working ? 'bg-violet-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${day.is_working ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>

              {day.is_working ? (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={day.open}
                    onChange={(e) => updateDay(i, { open: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-gray-400">—</span>
                  <select
                    value={day.close}
                    onChange={(e) => updateDay(i, { close: e.target.value })}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
                  >
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-red-500 font-medium">Выходной</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-6"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== PLACEHOLDER TAB =====================

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
