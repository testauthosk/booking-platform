"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

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
  ChevronDown,
  ChevronUp,
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
  Menu,
  PhoneCall,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

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
  time_end?: string;
  duration?: number;
  status: string;
  service_name?: string;
  service_id?: string;
  master_name?: string;
  master_id?: string;
  price?: number;
  services?: { id: string; name: string; duration: number; price: number }[];
}

interface CategoryData {
  id: string;
  name: string;
  order_index: number;
}

interface ServiceData {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  category_id?: string;
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
  working_hours?: WorkingHour[];
  services?: { service_id: string; price?: number }[];
}

interface ClientData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  visits_count: number;
  last_visit?: string;
  total_spent: number;
  created_at: string;
}

// ===================== PHONE FORMATTER =====================

function formatPhoneUA(value: string): string {
  // Убираем всё кроме цифр
  let digits = value.replace(/\D/g, '');

  // Если начинается с 380, убираем (добавим +380 автоматически)
  if (digits.startsWith('380')) {
    digits = digits.slice(3);
  }
  // Если начинается с 0, убираем
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Ограничиваем 9 цифрами (номер без кода страны)
  digits = digits.slice(0, 9);

  // Форматируем: XX XXX XX XX
  let formatted = '+380';
  if (digits.length > 0) formatted += ' ' + digits.slice(0, 2);
  if (digits.length > 2) formatted += ' ' + digits.slice(2, 5);
  if (digits.length > 5) formatted += ' ' + digits.slice(5, 7);
  if (digits.length > 7) formatted += ' ' + digits.slice(7, 9);

  return formatted;
}

// ===================== MAIN COMPONENT =====================

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<UserData | null>(null);
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [masters, setMasters] = useState<MasterData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    today: 0,
    week: 0,
    month: 0,
    revenue: 0,
    clients: 0,
    avgRating: 0
  });

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    loadUserData();
  }, [session, status]);

  // Закрытие сайдбара при изменении таба на мобильном
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  const loadUserData = async () => {
    if (!session?.user) {
      router.push('/login');
      return;
    }

    try {
      // Fetch all dashboard data from API
      const response = await fetch('/api/dashboard/data');
      const data = await response.json();

      if (!response.ok) {
        console.error('Dashboard API error:', data.error);
        setLoading(false);
        return;
      }

      if (data.user?.role === 'SUPER_ADMIN') {
        router.push('/admin');
        return;
      }

      setUser({
        id: data.user.id,
        email: data.user.email,
        role: data.user.role,
        salon_id: data.user.salonId,
      } as any);

      if (data.salon) {
        setSalon(data.salon);
        setServices(data.services || []);
        setCategories(data.categories || []);
        setMasters(data.masters || []);
        setClients(data.clients || []);
        setBookings(data.bookings || []);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = (data.bookings || []).filter((b: any) => b.date === today).length;
        const weekBookings = (data.bookings || []).filter((b: any) => {
          const bookingDate = new Date(b.date);
          const now = new Date();
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          return bookingDate >= weekAgo;
        }).length;
        setStats(prev => ({ ...prev, today: todayBookings, week: weekBookings }));
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }

    setLoading(false);
  };

  // Reload all data from API
  const reloadData = async () => {
    try {
      const response = await fetch('/api/dashboard/data');
      const data = await response.json();

      if (response.ok && data.salon) {
        setSalon(data.salon);
        setServices(data.services || []);
        setCategories(data.categories || []);
        setMasters(data.masters || []);
        setClients(data.clients || []);
        setBookings(data.bookings || []);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = (data.bookings || []).filter((b: any) => b.date === today).length;
        const weekBookings = (data.bookings || []).filter((b: any) => {
          const bookingDate = new Date(b.date);
          const now = new Date();
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          return bookingDate >= weekAgo;
        }).length;
        setStats(prev => ({ ...prev, today: todayBookings, week: weekBookings }));
      }
    } catch (err) {
      console.error('Reload error:', err);
    }
  };

  // Alias functions for backward compatibility
  const loadBookings = async () => reloadData();
  const loadServices = async () => reloadData();
  const loadCategories = async () => reloadData();
  const loadMasters = async () => reloadData();
  const loadClients = async () => reloadData();

  const handleSignOut = async () => {
    const { signOut } = await import('next-auth/react');
    await signOut({ redirect: false });
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

  const tabs = [
    { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
    { id: 'calendar', label: 'Календарь', icon: Calendar },
    { id: 'bookings', label: 'Записи', icon: CalendarCheck },
    { id: 'services', label: 'Услуги', icon: Scissors },
    { id: 'team', label: 'Команда', icon: Users },
    { id: 'clients', label: 'Клиенты', icon: UserCircle },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-gray-900 dark:text-white truncate">{salon.name}</h1>
          <button className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 h-full lg:h-screen w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                {salon.logo_url ? (
                  <img src={salon.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <Store className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                )}
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white truncate">{salon.name}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{salon.type}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5 flex-shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Тема</span>
            <ThemeToggle />
          </div>
          <a
            href={`/s/${salon.slug}`}
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Открыть сайт
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            Выйти
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:overflow-auto">
        {/* Desktop Header */}
        <header className="hidden lg:block bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label || 'Обзор'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{salon.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`/s/${salon.slug}`}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Открыть сайт
              </a>
              <button className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-6">
          {activeTab === 'overview' && (
            <OverviewTab salon={salon} bookings={bookings} stats={stats} onViewAll={() => setActiveTab('bookings')} />
          )}
          {activeTab === 'calendar' && (
            <CalendarTab
              bookings={bookings}
              masters={masters}
              services={services}
              salonId={salon.id}
              workingHours={salon.working_hours || []}
              onReload={() => loadBookings(salon.id)}
            />
          )}
          {activeTab === 'bookings' && (
            <BookingsTab
              bookings={bookings}
              salonId={salon.id}
              services={services}
              categories={categories}
              masters={masters}
              clients={clients}
              workingHours={salon.working_hours || []}
              onReload={() => {
                loadBookings(salon.id);
                loadClients(salon.id);
              }}
            />
          )}
          {activeTab === 'services' && (
            <ServicesTab
              services={services}
              categories={categories}
              salonId={salon.id}
              onReload={() => {
                loadServices(salon.id);
                loadCategories(salon.id);
              }}
            />
          )}
          {activeTab === 'team' && (
            <TeamTab
              masters={masters}
              services={services}
              salonId={salon.id}
              onReload={() => loadMasters(salon.id)}
            />
          )}
          {activeTab === 'clients' && (
            <ClientsTab
              clients={clients}
              salonId={salon.id}
              onReload={() => loadClients(salon.id)}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab salon={salon} onUpdate={(updates) => setSalon({ ...salon, ...updates })} />
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
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard title="Записей сегодня" value={stats.today} icon={CalendarCheck} color="violet" />
        <StatCard title="За неделю" value={stats.week} icon={TrendingUp} color="blue" />
        <StatCard title="Рейтинг" value={salon.rating || '—'} icon={Star} color="yellow" />
        <StatCard title="Отзывов" value={salon.review_count || 0} icon={UserCheck} color="green" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200">
        <div className="p-4 lg:p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Записи на сегодня</h2>
          <button onClick={onViewAll} className="text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1">
            Все <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {todayBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {todayBookings.slice(0, 5).map(booking => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        ) : (
          <div className="p-8 lg:p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет записей на сегодня</p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Контактная информация</h3>
          <div className="space-y-3">
            <InfoRow icon={Phone} label="Телефон" value={salon.phone || 'Не указан'} />
            <InfoRow icon={Mail} label="Email" value={salon.email || 'Не указан'} />
            <InfoRow icon={MapPin} label="Адрес" value={salon.address || 'Не указан'} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 lg:p-5">
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

function BookingsTab({ bookings, salonId, services, categories, masters, clients, workingHours, onReload }: {
  bookings: BookingData[];
  salonId: string;
  services: ServiceData[];
  categories: CategoryData[];
  masters: MasterData[];
  clients: ClientData[];
  workingHours: WorkingHour[];
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
      {/* Filters - Mobile Optimized */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 lg:p-4 space-y-3 lg:space-y-0 lg:flex lg:items-center lg:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 lg:flex-none status-select"
          >
            <option value="all">Все статусы</option>
            <option value="confirmed">Подтверждено</option>
            <option value="pending">Ожидает</option>
            <option value="completed">Завершено</option>
            <option value="cancelled">Отменено</option>
          </select>
          <Button
            onClick={() => setShowModal(true)}
            className="flex-1 lg:flex-none bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Новая запись</span>
            <span className="sm:hidden">Записать</span>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {filteredBookings.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {filteredBookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} showActions />
            ))}
          </div>
        ) : (
          <div className="p-8 lg:p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Записи не найдены</p>
          </div>
        )}
      </div>

      {showModal && (
        <QuickBookingModal
          salonId={salonId}
          services={services}
          categories={categories}
          masters={masters}
          clients={clients}
          bookings={bookings}
          workingHours={workingHours}
          onClose={() => setShowModal(false)}
          onSave={onReload}
        />
      )}
    </div>
  );
}

// ===================== QUICK BOOKING MODAL (ПОЛНОСТЬЮ ПЕРЕДЕЛАНА) =====================

function QuickBookingModal({ salonId, services, categories, masters, clients, bookings, workingHours, onClose, onSave }: {
  salonId: string;
  services: ServiceData[];
  categories: CategoryData[];
  masters: MasterData[];
  clients: ClientData[];
  bookings: BookingData[];
  workingHours: WorkingHour[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'services' | 'master' | 'calendar' | 'time' | 'client'>('services');

  // Выбранные услуги (можно несколько)
  const [selectedServices, setSelectedServices] = useState<ServiceData[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Мастер
  const [selectedMaster, setSelectedMaster] = useState<MasterData | null>(null);

  // Дата и время
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [animatingSlots, setAnimatingSlots] = useState<number[]>([]); // Для пошаговой анимации

  // Клиент
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+380');
  const [clientSearch, setClientSearch] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);

  // Доп. время (запас для мастера)
  const [extraTime, setExtraTime] = useState(0); // в минутах: 0, 5, 10, 15, 20, 30

  // Общая длительность выбранных услуг + доп. время
  const baseDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalDuration = baseDuration + extraTime;
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Группировка услуг по категориям
  const servicesByCategory = services.reduce((acc, service) => {
    const cat = service.category || 'Без категории';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, ServiceData[]>);

  const categoryNames = Object.keys(servicesByCategory);

  // Toggle категории
  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  // Toggle услуги
  const toggleService = (service: ServiceData) => {
    setSelectedServices(prev =>
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  // Рабочие часы мастера (или общие если мастер не выбран)
  const getWorkingHours = () => {
    if (selectedMaster?.working_hours?.length) {
      return selectedMaster.working_hours;
    }
    return workingHours;
  };

  // Проверка рабочий ли день
  const isWorkingDay = (date: Date) => {
    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    const dayName = dayNames[date.getDay()];
    const wh = getWorkingHours().find(h => h.day === dayName);
    return wh?.is_working ?? false;
  };

  // Проверка прошедшая ли дата
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Подсчёт доступных слотов на день
  const getAvailableSlots = (dateStr: string) => {
    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    const date = new Date(dateStr);
    const dayName = dayNames[date.getDay()];
    const wh = getWorkingHours().find(h => h.day === dayName);

    if (!wh?.is_working) return 0;

    const [openH, openM] = wh.open.split(':').map(Number);
    const [closeH, closeM] = wh.close.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    // Занятые слоты на этот день у этого мастера
    const dayBookings = bookings.filter(b => {
      if (b.date !== dateStr) return false;
      if (selectedMaster && b.master_id !== selectedMaster.id) return false;
      return true;
    });

    let availableCount = 0;
    const step = 30;
    const duration = totalDuration || 60;

    for (let mins = openMins; mins + duration <= closeMins; mins += step) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const slotStart = mins;
      const slotEnd = mins + duration;

      // Проверяем пересечение с бронями
      const isOverlapping = dayBookings.some(b => {
        const [bh, bm] = b.time.split(':').map(Number);
        const bookingStart = bh * 60 + bm;
        const bookingDuration = b.duration || 60;
        const bookingEnd = bookingStart + bookingDuration;
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      if (!isOverlapping) {
        availableCount++;
      }
    }

    return availableCount;
  };

  // Генерация слотов времени
  const generateTimeSlots = () => {
    if (!selectedDate) return [];

    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота'];
    const date = new Date(selectedDate);
    const dayName = dayNames[date.getDay()];
    const wh = getWorkingHours().find(h => h.day === dayName);

    if (!wh?.is_working) return [];

    const [openH, openM] = wh.open.split(':').map(Number);
    const [closeH, closeM] = wh.close.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    const dayBookings = bookings.filter(b => {
      if (b.date !== selectedDate) return false;
      if (selectedMaster && b.master_id !== selectedMaster.id) return false;
      return true;
    });

    const slots: { time: string; endTime: string; available: boolean; slotsNeeded: number; mins: number }[] = [];
    const step = 5; // Шаг 5 минут для админа
    const duration = totalDuration || 60;
    const slotsNeeded = Math.ceil(duration / step);

    for (let mins = openMins; mins + duration <= closeMins; mins += step) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      const endMins = mins + duration;
      const endH = Math.floor(endMins / 60);
      const endM = endMins % 60;
      const endTimeStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      const slotStart = mins;
      const slotEnd = mins + duration;

      const isOverlapping = dayBookings.some(b => {
        const [bh, bm] = b.time.split(':').map(Number);
        const bookingStart = bh * 60 + bm;
        const bookingDuration = b.duration || 60;
        const bookingEnd = bookingStart + bookingDuration;
        return (slotStart < bookingEnd && slotEnd > bookingStart);
      });

      slots.push({ time: timeStr, endTime: endTimeStr, available: !isOverlapping, slotsNeeded, mins });
    }

    return slots;
  };

  // Перевірка чи слот входить у вибраний діапазон
  const isSlotInSelectedRange = (slotMins: number) => {
    if (!selectedTime) return false;
    const [selH, selM] = selectedTime.split(':').map(Number);
    const selectedMins = selH * 60 + selM;
    const duration = totalDuration || 60;
    return slotMins >= selectedMins && slotMins < selectedMins + duration;
  };

  // Пошагова анімація виділення слотів
  const handleTimeSelect = (time: string, slotMins: number) => {
    const duration = totalDuration || 60;
    const slotsNeeded = Math.ceil(duration / 30);
    const slotMinsArray: number[] = [];

    for (let i = 0; i < slotsNeeded; i++) {
      slotMinsArray.push(slotMins + i * 30);
    }

    // Почистити і запустити анімацію
    setAnimatingSlots([]);
    setSelectedTime(time);

    // Пошагово додавати слоти з затримкою
    slotMinsArray.forEach((mins, index) => {
      setTimeout(() => {
        setAnimatingSlots(prev => [...prev, mins]);
      }, index * 80); // 80ms між кожним слотом
    });
  };

  // Перевірка чи слот анімується
  const isSlotAnimating = (slotMins: number) => animatingSlots.includes(slotMins);

  // Генерация календаря
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7;

    const days: (Date | null)[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const timeSlots = generateTimeSlots();
  const calendarDays = generateCalendarDays();

  // Фильтрация клиентов
  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.phone.includes(clientSearch)
  );

  // Навигация
  const canGoNext = () => {
    switch (step) {
      case 'services': return selectedServices.length > 0;
      case 'master': return true; // Мастер опционален
      case 'calendar': return !!selectedDate;
      case 'time': return !!selectedTime;
      case 'client': return (selectedClient || (clientName && clientPhone));
      default: return false;
    }
  };

  const goNext = () => {
    const steps: typeof step[] = ['services', 'master', 'calendar', 'time', 'client'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goBack = () => {
    const steps: typeof step[] = ['services', 'master', 'calendar', 'time', 'client'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  // Отправка
  const handleSubmit = async () => {
    const name = selectedClient?.name || clientName;
    const phone = selectedClient?.phone || clientPhone;

    if (!name || !phone || !selectedDate || !selectedTime) {
      alert('Заповніть всі обов\'язкові поля');
      return;
    }

    setSaving(true);
    console.log('Starting booking creation...');

    try {
      // Если новый клиент - создаём его
      let clientId = selectedClient?.id;
      if (!clientId && isNewClient) {
        console.log('Creating new client...');
        const clientRes = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: clientName, phone: clientPhone }),
        });

        if (!clientRes.ok) {
          alert('Помилка створення клієнта');
          setSaving(false);
          return;
        }

        const newClient = await clientRes.json();
        console.log('Client created:', newClient);
        clientId = newClient.id;
      }

      // Расчёт времени окончания
      const [h, m] = selectedTime.split(':').map(Number);
      const endMins = h * 60 + m + totalDuration;
      const endH = Math.floor(endMins / 60);
      const endM = endMins % 60;
      const timeEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

      console.log('Creating booking...');
      const bookingRes = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId,
          clientId,
          clientName: name,
          clientPhone: phone,
          clientEmail: selectedClient?.email || '',
          date: selectedDate,
          time: selectedTime,
          timeEnd,
          duration: totalDuration,
          serviceId: selectedServices[0]?.id || null,
          serviceName: selectedServices.map(s => s.name).join(', '),
          masterId: selectedMaster?.id || null,
          masterName: selectedMaster?.name || '',
          price: totalPrice,
        }),
      });

      console.log('Booking result:', bookingRes.ok ? 'success' : 'error');

      if (!bookingRes.ok) {
        alert('Помилка створення запису');
        setSaving(false);
        return;
      }

      setSaving(false);
      onSave();
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('Несподівана помилка');
      setSaving(false);
    }
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const stepTitles = {
    services: 'Выберите услуги',
    master: 'Выберите мастера',
    calendar: 'Выберите дату',
    time: 'Выберите время',
    client: 'Данные клиента',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50">
      <div className="bg-white w-full lg:w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 lg:p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'services' && (
              <button
                onClick={goBack}
                className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Новая запись</h2>
              <p className="text-sm text-gray-500">{stepTitles[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5">

          {/* STEP 1: Услуги по категориям (Accordion) */}
          {step === 'services' && (
            <div className="space-y-2">
              {categoryNames.map(cat => (
                <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleCategory(cat)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{cat}</span>
                      <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                        {servicesByCategory[cat].length}
                      </span>
                    </div>
                    {expandedCategories.includes(cat) ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedCategories.includes(cat) && (
                    <div className="divide-y divide-gray-100">
                      {servicesByCategory[cat].map(service => {
                        const isSelected = selectedServices.find(s => s.id === service.id);
                        return (
                          <button
                            key={service.id}
                            onClick={() => toggleService(service)}
                            className={`w-full p-4 text-left transition-all ${
                              isSelected ? 'bg-violet-50' : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${isSelected ? 'text-violet-900' : 'text-gray-900'}`}>
                                  {service.name}
                                </p>
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {service.duration} мин
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-semibold ${isSelected ? 'text-violet-600' : 'text-gray-900'}`}>
                                  {service.price} ₴
                                </span>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-violet-600 border-violet-600'
                                    : 'border-gray-300'
                                }`}>
                                  {isSelected && <Check className="w-4 h-4 text-white" />}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {selectedServices.length > 0 && (
                <div className="mt-4 p-4 bg-violet-50 rounded-xl">
                  <p className="text-sm font-medium text-violet-900 mb-2">
                    Выбрано: {selectedServices.length} {selectedServices.length === 1 ? 'услуга' : 'услуги'}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-violet-600">Общее время: {totalDuration} мин</span>
                    <span className="font-semibold text-violet-900">{totalPrice} ₴</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Выбор мастера */}
          {step === 'master' && (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedMaster(null)}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  !selectedMaster
                    ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">Любой свободный мастер</p>
                <p className="text-sm text-gray-500 mt-0.5">Система подберёт доступного мастера</p>
              </button>

              {masters.map(master => (
                <button
                  key={master.id}
                  onClick={() => setSelectedMaster(master)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    selectedMaster?.id === master.id
                      ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                      {master.photo_url ? (
                        <img src={master.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{master.name}</p>
                      <p className="text-sm text-gray-500">{master.position || 'Мастер'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* STEP 3: Календарь с количеством слотов */}
          {step === 'calendar' && (
            <div>
              {/* Сводка */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                <p className="text-gray-600">
                  <span className="font-medium text-gray-900">{selectedServices.length} {selectedServices.length === 1 ? 'услуга' : 'услуги'}</span>
                  {' • '}{totalDuration} мин{' • '}
                  {selectedMaster ? selectedMaster.name : 'Любой мастер'}
                </p>
              </div>

              {/* Навигация */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5 rotate-180" />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Дни недели */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
                ))}
              </div>

              {/* Календарь */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) {
                    return <div key={i} className="aspect-square" />;
                  }

                  const dateStr = date.toISOString().split('T')[0];
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = isPastDate(date);
                  const isWorking = isWorkingDay(date);
                  const isSelected = dateStr === selectedDate;
                  const availableSlots = !isPast && isWorking ? getAvailableSlots(dateStr) : 0;
                  const isDisabled = isPast || !isWorking || availableSlots === 0;

                  return (
                    <button
                      key={i}
                      onClick={() => !isDisabled && setSelectedDate(dateStr)}
                      disabled={isDisabled}
                      className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all relative ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : isToday && !isDisabled
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                          : isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="font-medium">{date.getDate()}</span>
                      {!isDisabled && availableSlots > 0 && (
                        <span className={`text-[10px] ${isSelected ? 'text-violet-200' : 'text-gray-400'}`}>
                          {availableSlots}
                        </span>
                      )}
                      {isDisabled && !isPast && isWorking && (
                        <span className="text-[10px] text-gray-400">0</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Легенда */}
              <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-violet-100"></span>
                  Сегодня
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-200"></span>
                  Нет мест
                </span>
                <span className="text-gray-400">Цифра = кол-во слотов</span>
              </div>
            </div>
          )}

          {/* STEP 4: Выбор времени */}
          {step === 'time' && (
            <div>
              {/* Сводка */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl text-sm">
                <p className="text-gray-900 font-medium">
                  {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <p className="text-gray-500 mt-0.5">
                  {baseDuration} мин{extraTime > 0 ? ` + ${extraTime} мин запас` : ''} • {selectedMaster?.name || 'Любой мастер'}
                </p>
              </div>

              {/* Доп. время (запас) */}
              <div className="mb-4 p-3 bg-violet-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Доп. час (запас)</span>
                  <span className="text-sm text-violet-600 font-medium">
                    {extraTime > 0 ? `+${extraTime} хв` : 'Без запасу'}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[0, 5, 10, 15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      onClick={() => setExtraTime(mins)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                        extraTime === mins
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-gray-600 hover:bg-violet-100'
                      }`}
                    >
                      {mins === 0 ? '—' : `+${mins}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Загальний час */}
              <div className="text-xs text-gray-500 mb-2">
                Загальний час: {totalDuration} хв
              </div>

              {/* Слоты времени */}
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map(slot => {
                  const isSelected = selectedTime === slot.time;
                  const isInRange = isSlotInSelectedRange(slot.mins);
                  const isAnimating = isSlotAnimating(slot.mins);

                  return (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && handleTimeSelect(slot.time, slot.mins)}
                      disabled={!slot.available}
                      className={`p-3 rounded-xl text-left transition-all duration-300 ${
                        isSelected
                          ? 'bg-violet-600 text-white ring-2 ring-violet-600 ring-offset-2 scale-[1.02]'
                          : isAnimating
                          ? 'bg-violet-200 border-2 border-violet-500 scale-[1.02]'
                          : isInRange
                          ? 'bg-violet-100 border-2 border-violet-400'
                          : slot.available
                          ? 'bg-gray-50 hover:bg-violet-50 border border-gray-200 hover:border-violet-300'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      <p className={`font-semibold ${
                        isSelected ? 'text-white' :
                        isAnimating || isInRange ? 'text-violet-700' :
                        slot.available ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {slot.time}
                      </p>
                      <p className={`text-xs ${
                        isSelected ? 'text-violet-200' :
                        isAnimating || isInRange ? 'text-violet-500' :
                        'text-gray-500'
                      }`}>
                        {isSelected ? `до ${slot.endTime}` : (isAnimating || isInRange) ? 'зайнято' : `до ${slot.endTime}`}
                      </p>
                    </button>
                  );
                })}
              </div>

              {timeSlots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p>Нет доступного времени</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: Клиент */}
          {step === 'client' && (
            <div className="space-y-4">
              {/* Сводка записи */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Дата</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Время</span>
                  <span className="font-medium text-gray-900">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Услуги</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">
                    {selectedServices.map(s => s.name).join(', ')}
                  </span>
                </div>
                {selectedMaster && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Мастер</span>
                    <span className="font-medium text-gray-900">{selectedMaster.name}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-medium text-gray-900">Итого</span>
                  <span className="font-bold text-violet-600">{totalPrice} ₴</span>
                </div>
              </div>

              {/* Выбор из базы или новый */}
              {!isNewClient ? (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Ім'я або телефон..."
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-violet-500"
                      autoFocus
                    />
                  </div>

                  {/* Випадаюче меню з результатами або кнопка створити */}
                  {clientSearch.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      {filteredClients.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                          {filteredClients.slice(0, 10).map(client => (
                            <button
                              key={client.id}
                              onClick={() => {
                                setSelectedClient(client);
                                setClientSearch('');
                              }}
                              className={`w-full p-3 text-left transition-all hover:bg-gray-50 ${
                                selectedClient?.id === client.id ? 'bg-violet-50' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-gray-900">{client.name}</p>
                                  <p className="text-sm text-gray-500">{client.phone} • {client.visits_count} візитів</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setIsNewClient(true);
                            setClientName(clientSearch);
                          }}
                          className="w-full p-4 text-left hover:bg-violet-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                              <Plus className="w-5 h-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="font-medium text-violet-600">Створити "{clientSearch}"</p>
                              <p className="text-sm text-gray-500">Додати нового клієнта</p>
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Вибраний клієнт */}
                  {selectedClient && (
                    <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{selectedClient.name}</p>
                          <p className="text-sm text-gray-600">{selectedClient.phone}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${selectedClient.phone}`}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => setSelectedClient(null)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Якщо нічого не введено і немає вибраного */}
                  {clientSearch.length === 0 && !selectedClient && (
                    <button
                      onClick={() => setIsNewClient(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-violet-400 hover:text-violet-600 transition-colors"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Новий клієнт
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsNewClient(false)}
                    className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                  >
                    ← Выбрать из базы
                  </button>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя *</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="form-input"
                        placeholder="Введите имя"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон *</label>
                      <input
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(formatPhoneUA(e.target.value))}
                        className="form-input"
                        placeholder="+380 XX XXX XX XX"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 lg:p-5 border-t border-gray-100 flex-shrink-0 safe-area-bottom">
          {step !== 'client' ? (
            <Button
              onClick={goNext}
              disabled={!canGoNext()}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 disabled:opacity-50"
            >
              Далее
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || (!selectedClient && (!clientName || !clientPhone))}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-12 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Check className="w-5 h-5 mr-2" />
                  Создать запись
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===================== SERVICES TAB =====================

function ServicesTab({ services, categories, salonId, onReload }: {
  services: ServiceData[];
  categories: CategoryData[];
  salonId: string;
  onReload: () => void
}) {
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceData | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Группировка по категориям
  const servicesByCategory = services.reduce((acc, service) => {
    const cat = service.category || 'Без категории';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(service);
    return acc;
  }, {} as Record<string, ServiceData[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleEdit = (service: ServiceData) => {
    setEditingService(service);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту услугу?')) return;
    setDeleting(id);
    await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
    onReload();
    setDeleting(null);
  };

  const handleSave = async (data: Partial<ServiceData>) => {
    // Находим или создаём категорию
    let categoryId = editingService?.category_id;
    const categoryName = data.category || 'Загальні';

    // Получаем или создаём категорию через API
    const catRes = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName }),
    });

    if (catRes.ok) {
      const cat = await catRes.json();
      categoryId = cat.id;
    }

    if (!categoryId) {
      alert('Помилка: категорія не знайдена');
      return;
    }

    if (editingService) {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingService.id,
          name: data.name,
          price: data.price,
          duration: data.duration,
          categoryId,
          isActive: true,
        }),
      });
      if (!res.ok) {
        alert('Помилка оновлення послуги');
        return;
      }
    } else {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          price: data.price,
          duration: data.duration,
          categoryId,
          isActive: true,
        }),
      });
      if (!res.ok) {
        alert('Помилка створення послуги');
        return;
      }
    }
    setShowModal(false);
    setEditingService(null);
    onReload();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-gray-500">{services.length} услуг в {Object.keys(servicesByCategory).length} категориях</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCategoryModal(true)}
            className="rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Категория
          </Button>
          <Button
            onClick={() => { setEditingService(null); setShowModal(true); }}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Услуга
          </Button>
        </div>
      </div>

      {Object.entries(servicesByCategory).map(([category, categoryServices]) => {
        const isExpanded = expandedCategories.has(category);
        return (
          <div key={category} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900">{category}</h3>
                <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                  {categoryServices.length}
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            <div
              style={{
                maxHeight: isExpanded ? `${categoryServices.length * 80}px` : '0px',
                opacity: isExpanded ? 1 : 0,
                transition: 'max-height 0.4s ease-in-out, opacity 0.3s ease-in-out'
              }}
              className="divide-y divide-gray-100 overflow-hidden"
            >
              {categoryServices.map(service => (
                <div key={service.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{service.name}</p>
                    <p className="text-sm text-gray-500">{service.duration} • {service.price} ₴</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(service)}
                      className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      disabled={deleting === service.id}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      {deleting === service.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {services.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 lg:p-12 text-center">
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
          categories={Object.keys(servicesByCategory)}
          onClose={() => { setShowModal(false); setEditingService(null); }}
          onSave={handleSave}
        />
      )}

      {showCategoryModal && (
        <CategoryModal
          salonId={salonId}
          onClose={() => setShowCategoryModal(false)}
          onSave={onReload}
        />
      )}
    </div>
  );
}

function ServiceModal({ service, categories, onClose, onSave }: {
  service: ServiceData | null;
  categories: string[];
  onClose: () => void;
  onSave: (data: Partial<ServiceData>) => void
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    price: service?.price || 0,
    duration: service?.duration || 30,
    category: service?.category || categories[0] || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50">
      <div className="bg-white w-full lg:w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{service ? 'Редактировать' : 'Новая услуга'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Категория</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="form-input"
              placeholder="Например: Стрижки"
              list="categories"
            />
            <datalist id="categories">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Длительность</label>
              <select
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                className="form-select"
              >
                <option value={15}>15 мин</option>
                <option value={30}>30 мин</option>
                <option value={45}>45 мин</option>
                <option value={60}>1 час</option>
                <option value={90}>1.5 часа</option>
                <option value={120}>2 часа</option>
                <option value={180}>3 часа</option>
                <option value={240}>4 часа</option>
              </select>
            </div>
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

function CategoryModal({ salonId, onClose, onSave }: { salonId: string; onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Новая категория</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="form-input"
            placeholder="Название категории"
            autoFocus
          />
          <Button type="submit" disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ===================== TEAM TAB =====================

function TeamTab({ masters, services, salonId, onReload }: {
  masters: MasterData[];
  services: ServiceData[];
  salonId: string;
  onReload: () => void
}) {
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
    await fetch(`/api/masters?id=${id}`, { method: 'DELETE' });
    onReload();
    setDeleting(null);
  };

  const handleSave = async (data: Partial<MasterData>) => {
    try {
      if (editingMaster) {
        const res = await fetch('/api/masters', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingMaster.id, ...data }),
        });
        if (!res.ok) {
          alert('Помилка оновлення');
          return;
        }
      } else {
        const res = await fetch('/api/masters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, isActive: true }),
        });
        if (!res.ok) {
          alert('Помилка створення');
          return;
        }
      }
      setShowModal(false);
      setEditingMaster(null);
      onReload();
    } catch (err) {
      console.error('Master save error:', err);
      alert('Помилка збереження');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{masters.length} мастеров</p>
        <Button onClick={() => { setEditingMaster(null); setShowModal(true); }} className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {masters.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {masters.map(master => (
            <div key={master.id} className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {master.photo_url ? (
                      <img src={master.photo_url} alt={master.name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{master.name}</h3>
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
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{master.phone || 'Не указан'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 lg:p-12 text-center">
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
          services={services}
          onClose={() => { setShowModal(false); setEditingMaster(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function MasterModal({ master, services, onClose, onSave }: {
  master: MasterData | null;
  services: ServiceData[];
  onClose: () => void;
  onSave: (data: Partial<MasterData>) => void
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: master?.name || '',
    position: master?.position || '',
    phone: master?.phone || '+380',
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
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50">
      <div className="bg-white w-full lg:w-full lg:max-w-lg lg:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">{master ? 'Редактировать' : 'Новый мастер'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
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
                onChange={(e) => setForm({ ...form, phone: formatPhoneUA(e.target.value) })}
                className="form-input"
                placeholder="+380 XX XXX XX XX"
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

// ===================== CLIENTS TAB =====================

function ClientsTab({ clients, salonId, onReload }: {
  clients: ClientData[];
  salonId: string;
  onReload: () => void;
}) {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цього клієнта?')) return;
    setDeleting(id);
    await fetch(`/api/clients?id=${id}`, { method: 'DELETE' });
    onReload();
    setDeleting(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Пошук за ім'ям або телефоном..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-0 text-sm focus:outline-none"
            />
          </div>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg whitespace-nowrap"
        >
          <Plus className="w-4 h-4 mr-2" />
          Додати
        </Button>
      </div>

      {filteredClients.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filteredClients.map(client => (
            <div key={client.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{client.name}</p>
                <p className="text-sm text-gray-500">
                  {client.phone} • {client.visits_count} візитів • {client.total_spent} ₴
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`tel:${client.phone}`}
                  className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"
                >
                  <PhoneCall className="w-4 h-4" />
                </a>
                <button
                  onClick={() => handleDelete(client.id)}
                  disabled={deleting === client.id}
                  className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100"
                >
                  {deleting === client.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 lg:p-12 text-center">
          <UserCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? 'Клієнтів не знайдено' : 'База клієнтів порожня'}
          </p>
          <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
            <Plus className="w-4 h-4 mr-2" />
            Додати першого клієнта
          </Button>
        </div>
      )}

      {showAddModal && (
        <AddClientModal
          salonId={salonId}
          onClose={() => setShowAddModal(false)}
          onSave={() => { setShowAddModal(false); onReload(); }}
        />
      )}
    </div>
  );
}

// Modal для додавання клієнта
function AddClientModal({ salonId, onClose, onSave }: { salonId: string; onClose: () => void; onSave: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '+380', email: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      alert('Ім\'я та телефон обов\'язкові');
      return;
    }
    setSaving(true);
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
      }),
    });
    if (!res.ok) {
      alert('Помилка створення клієнта');
      setSaving(false);
      return;
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Новий клієнт</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ім'я *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="form-input"
              placeholder="Ім'я клієнта"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон *</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: formatPhoneUA(e.target.value) })}
              className="form-input"
              placeholder="+380 XX XXX XX XX"
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
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
              Скасувати
            </Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Зберегти'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== SCHEDULE TAB =====================

function ScheduleTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [schedule, setSchedule] = useState<WorkingHour[]>(
    salon.working_hours?.length ? salon.working_hours : [
      { day: 'Понеділок', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Вівторок', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Середа', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Четвер', is_working: true, open: '09:00', close: '20:00' },
      { day: 'П\'ятниця', is_working: true, open: '09:00', close: '20:00' },
      { day: 'Субота', is_working: true, open: '10:00', close: '18:00' },
      { day: 'Неділя', is_working: false, open: '10:00', close: '18:00' },
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
    setSaved(false);
  };

  const getInvalidDays = () => {
    return schedule
      .map((day, index) => {
        if (!day.is_working) return null;
        const [openH, openM] = day.open.split(':').map(Number);
        const [closeH, closeM] = day.close.split(':').map(Number);
        const openMins = openH * 60 + openM;
        const closeMins = closeH * 60 + closeM;
        if (closeMins <= openMins) {
          return { index, day: day.day };
        }
        return null;
      })
      .filter(Boolean) as { index: number; day: string }[];
  };

  const invalidDays = getInvalidDays();
  const hasErrors = invalidDays.length > 0;

  const handleSave = async () => {
    if (hasErrors) return;

    setSaving(true);
    const res = await fetch('/api/salon/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workingHours: schedule }),
    });

    if (res.ok) {
      onUpdate({ working_hours: schedule });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const applyPreset = (type: 'weekdays' | 'everyday') => {
    let newSchedule: WorkingHour[];

    if (type === 'weekdays') {
      newSchedule = schedule.map((day, i) => ({
        ...day,
        is_working: i < 5,
        open: '09:00',
        close: '18:00',
      }));
    } else {
      newSchedule = schedule.map(day => ({
        ...day,
        is_working: true,
        open: '10:00',
        close: '22:00',
      }));
    }

    setSchedule(newSchedule);
    setSaved(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Пресеты */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Быстрые настройки</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => applyPreset('weekdays')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Пн-Пт (9:00-18:00)
          </button>
          <button
            onClick={() => applyPreset('everyday')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Каждый день (10:00-22:00)
          </button>
        </div>
      </div>

      {/* Расписание */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className="font-semibold text-gray-900">Часы работы</h2>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Сохранено
            </span>
          )}
        </div>

        <div className="space-y-3">
          {schedule.map((day, i) => {
            const isInvalid = invalidDays.some(d => d.index === i);

            return (
              <div
                key={day.day}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                  isInvalid ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'
                }`}
              >
                {/* День - фиксированная ширина */}
                <span className="text-sm font-medium text-gray-700 w-28 flex-shrink-0">{day.day}</span>

                {/* Toggle - фиксированная позиция */}
                <button
                  onClick={() => updateDay(i, { is_working: !day.is_working })}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    day.is_working ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                    day.is_working ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>

                {/* Время */}
                {day.is_working ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={day.open}
                      onChange={(e) => updateDay(i, { open: e.target.value })}
                      className="time-select flex-1 sm:flex-none"
                    >
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400 font-medium">—</span>
                    <select
                      value={day.close}
                      onChange={(e) => updateDay(i, { close: e.target.value })}
                      className={`time-select flex-1 sm:flex-none ${isInvalid ? 'border-red-400 bg-red-50' : ''}`}
                    >
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {isInvalid && (
                      <span className="text-xs text-red-600 hidden sm:inline">Ошибка</span>
                    )}
                  </div>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    Выходной
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {hasErrors && (
          <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Ошибка</p>
              <p className="text-sm text-red-600 mt-1">
                Время закрытия должно быть позже открытия: {invalidDays.map(d => d.day).join(', ')}
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || hasErrors}
            className={`rounded-xl px-6 ${
              hasErrors ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Сохранить
          </Button>
        </div>
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
    await fetch('/api/salon/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    onUpdate(formData);
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-4 lg:space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 lg:mb-6">Основная информация</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Название</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Тип</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="form-select"
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
              className="form-input resize-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4 lg:mb-6">Контакты</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Адрес</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="form-input"
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
          Сохранить
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

  // Upload file to Cloudinary via API
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      return data.url;
    } catch (err) {
      console.error('Upload error:', err);
      alert('Помилка завантаження файлу');
      return null;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const url = await uploadFile(file, `logos/${salon.id}`);
    if (url) {
      const res = await fetch('/api/salon/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: url }),
      });
      if (res.ok) {
        onUpdate({ logo_url: url });
      }
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
      const res = await fetch('/api/salon/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: updatedPhotos }),
      });
      if (res.ok) {
        onUpdate({ photos: updatedPhotos });
      }
    }
    setUploading(false);
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const handleDeletePhoto = async (index: number) => {
    setDeletingPhoto(index);
    const updatedPhotos = salon.photos.filter((_, i) => i !== index);
    const res = await fetch('/api/salon/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: updatedPhotos }),
    });
    if (res.ok) {
      onUpdate({ photos: updatedPhotos });
    }
    setDeletingPhoto(null);
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Удалить логотип?')) return;
    const res = await fetch('/api/salon/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logo: null }),
    });
    if (res.ok) {
      onUpdate({ logo_url: '' });
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Логотип</h2>
        <div className="flex items-center gap-4 lg:gap-6">
          <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gray-100 rounded-xl flex items-center justify-center overflow-hidden relative group flex-shrink-0">
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
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            <Button
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              className="rounded-lg mb-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Загрузить
            </Button>
            <p className="text-xs text-gray-500">PNG, JPG до 2MB</p>
          </div>
        </div>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Фотографии</h2>
          <input ref={photosInputRef} type="file" accept="image/*" multiple onChange={handlePhotosUpload} className="hidden" />
          <Button variant="outline" onClick={() => photosInputRef.current?.click()} disabled={uploading} className="rounded-lg">
            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Добавить
          </Button>
        </div>

        {(salon.photos || []).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
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
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 lg:p-12 text-center">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">Фотографии ещё не добавлены</p>
            <Button variant="outline" onClick={() => photosInputRef.current?.click()} disabled={uploading} className="rounded-lg">
              <Upload className="w-4 h-4 mr-2" />
              Загрузить
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== CALENDAR TAB (Main Schedule View) =====================

function CalendarTab({ bookings, masters, services, salonId, workingHours, onReload }: {
  bookings: BookingData[];
  masters: MasterData[];
  services: ServiceData[];
  salonId: string;
  workingHours: WorkingHour[];
  onReload: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingData | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  // Константы для расчёта высоты
  const HOUR_HEIGHT = 120; // px за час (2px за минуту)
  const SLOT_HEIGHT = HOUR_HEIGHT / 2; // 60px за 30 мин

  // Получаем рабочие часы для выбранного дня
  const getDaySchedule = () => {
    // Украинские названия дней (как в БД)
    const dayName = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'П\'ятниця', 'Субота'][selectedDate.getDay()];
    return workingHours.find(wh => wh.day === dayName);
  };

  const daySchedule = getDaySchedule();

  // Генерируем временные слоты (только полные часы для отображения)
  // Всегда показываем сетку — в выходные используем дефолтные часы
  const generateHourSlots = () => {
    const slots: number[] = [];
    
    // Берём часы из расписания или дефолтные 9:00-20:00
    let startH = 9;
    let endH = 20;
    
    if (daySchedule?.is_working && daySchedule.open && daySchedule.close) {
      [startH] = daySchedule.open.split(':').map(Number);
      [endH] = daySchedule.close.split(':').map(Number);
    } else {
      // Пробуем взять часы из любого рабочего дня
      const anyWorkingDay = workingHours.find(wh => wh.is_working);
      if (anyWorkingDay) {
        [startH] = anyWorkingDay.open.split(':').map(Number);
        [endH] = anyWorkingDay.close.split(':').map(Number);
      }
    }

    for (let h = startH; h <= endH; h++) {
      slots.push(h);
    }
    return slots;
  };

  const hourSlots = generateHourSlots();
  const dateStr = selectedDate.toISOString().split('T')[0];
  const dayBookings = bookings.filter(b => b.date === dateStr);

  // Получаем записи для конкретного мастера
  // Записи без мастера показываем в первой колонке
  const getBookingsForMaster = (masterId: string, isFirstMaster: boolean = false) => {
    return dayBookings.filter(b => {
      if (b.master_id === masterId) return true;
      // Записи без мастера показываем в первой колонке
      if (isFirstMaster && !b.master_id) return true;
      return false;
    });
  };

  // Расчёт позиции записи
  const getBookingPosition = (booking: BookingData) => {
    if (!daySchedule?.is_working) return { top: 0, height: 0 };
    
    const [startH, startM] = daySchedule.open.split(':').map(Number);
    const scheduleStartMins = startH * 60 + startM;
    
    const [bookingH, bookingM] = booking.time.split(':').map(Number);
    const bookingStartMins = bookingH * 60 + bookingM;
    
    const offsetMins = bookingStartMins - scheduleStartMins;
    const top = (offsetMins / 60) * HOUR_HEIGHT;
    const height = ((booking.duration || 30) / 60) * HOUR_HEIGHT;
    
    return { top, height: Math.max(height, 40) }; // минимум 40px
  };

  // Расчёт позиции текущего времени
  const updateCurrentTimePosition = () => {
    const now = new Date();
    if (!daySchedule?.is_working) {
      setCurrentTimePosition(null);
      return;
    }
    
    // Только если сегодня
    if (selectedDate.toDateString() !== now.toDateString()) {
      setCurrentTimePosition(null);
      return;
    }

    const [startH, startM] = daySchedule.open.split(':').map(Number);
    const [endH, endM] = daySchedule.close.split(':').map(Number);
    const scheduleStartMins = startH * 60 + startM;
    const scheduleEndMins = endH * 60 + endM;
    
    const nowMins = now.getHours() * 60 + now.getMinutes();
    
    if (nowMins < scheduleStartMins || nowMins > scheduleEndMins) {
      setCurrentTimePosition(null);
      return;
    }
    
    const offsetMins = nowMins - scheduleStartMins;
    setCurrentTimePosition((offsetMins / 60) * HOUR_HEIGHT);
  };

  // Обновляем позицию текущего времени каждую минуту
  useEffect(() => {
    updateCurrentTimePosition();
    const interval = setInterval(updateCurrentTimePosition, 60000);
    return () => clearInterval(interval);
  }, [selectedDate, daySchedule]);

  // Скролл к текущему времени при загрузке
  useEffect(() => {
    if (currentTimePosition !== null && scrollContainerRef.current) {
      const scrollTarget = Math.max(0, currentTimePosition - 100);
      scrollContainerRef.current.scrollTop = scrollTarget;
    }
  }, [currentTimePosition]);

  // Навигация по дням
  const goToPrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // Генерируем дни недели для нижней навигации
  const getWeekDays = () => {
    const days = [];
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const dayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'НД'];

  const formatDate = (date: Date) => {
    const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    const weekDays = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'п\'ятниця', 'субота'];
    return `${date.getDate()} ${months[date.getMonth()]}, ${weekDays[date.getDay()]}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const filteredMasters = selectedMasterFilter
    ? masters.filter(m => m.id === selectedMasterFilter)
    : masters;

  // Цвета для записей по статусу
  const getBookingStyles = (booking: BookingData) => {
    const colors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
      confirmed: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', text: 'text-emerald-900', accent: 'bg-emerald-500' },
      pending: { bg: 'bg-amber-50', border: 'border-l-amber-500', text: 'text-amber-900', accent: 'bg-amber-500' },
      completed: { bg: 'bg-sky-50', border: 'border-l-sky-500', text: 'text-sky-900', accent: 'bg-sky-500' },
      cancelled: { bg: 'bg-red-50', border: 'border-l-red-400', text: 'text-red-800', accent: 'bg-red-400' },
    };
    return colors[booking.status] || colors.confirmed;
  };

  // Общая высота сетки
  const gridHeight = hourSlots.length > 0 ? (hourSlots.length) * HOUR_HEIGHT : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToToday}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${
              isToday(selectedDate) 
                ? 'bg-violet-100 border-violet-200 text-violet-700' 
                : 'border-gray-200 hover:bg-gray-50 text-gray-600'
            }`}
          >
            Сьогодні
          </button>
          <button onClick={goToPrevDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <button onClick={goToNextDay} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
            <ChevronRight className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 dark:text-white ml-2">{formatDate(selectedDate)}</span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedMasterFilter || ''}
            onChange={(e) => setSelectedMasterFilter(e.target.value || null)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="">Усі майстри</option>
            {masters.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col shadow-sm">
        {/* Masters Header */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700" />
          {filteredMasters.map(master => (
            <div key={master.id} className="flex-1 min-w-[160px] p-3 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                  {master.photo_url ? (
                    <img src={master.photo_url} alt={master.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Users className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{master.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{master.position || 'Майстер'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Time Grid */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-auto">
            <div className="relative" style={{ height: `${gridHeight}px`, minWidth: `${filteredMasters.length * 160 + 64}px` }}>
              
              {/* Overlay для выходного дня */}
              {!daySchedule?.is_working && (
                <div className="absolute inset-0 bg-gray-100/80 dark:bg-gray-900/80 z-30 flex items-center justify-center">
                  <div className="text-center bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                    <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium text-gray-600 dark:text-gray-300">Вихідний день</p>
                    <p className="text-sm text-gray-400 mt-1">Салон не працює</p>
                  </div>
                </div>
              )}
              {/* Time labels and grid lines */}
              {hourSlots.map((hour, idx) => (
                <div 
                  key={hour} 
                  className="absolute left-0 right-0 flex"
                  style={{ top: `${idx * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                  {/* Time label */}
                  <div className="w-16 flex-shrink-0 border-r border-gray-100 dark:border-gray-700 relative">
                    <span className="absolute -top-2.5 right-2 text-xs font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-1">
                      {hour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  
                  {/* Grid cells for each master */}
                  {filteredMasters.map((master, mIdx) => (
                    <div 
                      key={master.id}
                      className={`flex-1 min-w-[160px] border-r border-gray-100 dark:border-gray-700 last:border-r-0 ${
                        mIdx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'
                      }`}
                    >
                      {/* Hour line */}
                      <div className="h-1/2 border-b border-gray-100 dark:border-gray-700" />
                      {/* Half hour line (dashed) */}
                      <div className="h-1/2 border-b border-dashed border-gray-100 dark:border-gray-700" />
                    </div>
                  ))}
                </div>
              ))}

              {/* Current time indicator */}
              {currentTimePosition !== null && (
                <div 
                  className="absolute left-0 right-0 z-20 pointer-events-none"
                  style={{ top: `${currentTimePosition}px` }}
                >
                  <div className="flex items-center">
                    <div className="w-16 flex-shrink-0 flex items-center justify-end pr-1">
                      <span className="text-[10px] font-bold text-red-500 bg-white dark:bg-gray-800 px-1 rounded">
                        {new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex-1 h-0.5 bg-red-500 relative">
                      <div className="absolute -left-1 -top-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    </div>
                  </div>
                </div>
              )}

              {/* Bookings */}
              {filteredMasters.map((master, masterIndex) => {
                const masterBookings = getBookingsForMaster(master.id, masterIndex === 0);
                return masterBookings.map(booking => {
                  const { top, height } = getBookingPosition(booking);
                  const styles = getBookingStyles(booking);
                  
                  return (
                    <div
                      key={booking.id}
                      onClick={() => setSelectedBooking(booking)}
                      className={`absolute cursor-pointer rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all overflow-hidden ${styles.bg} ${styles.border}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        left: `${64 + masterIndex * 160 + 4}px`,
                        width: '152px',
                      }}
                    >
                      <div className="p-2 h-full flex flex-col">
                        {/* Time */}
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${styles.text}`}>
                            {booking.time}—{booking.time_end || ''}
                          </span>
                          {booking.status === 'pending' && (
                            <span className="px-1.5 py-0.5 bg-amber-400 text-amber-900 text-[10px] font-bold rounded uppercase">
                              new
                            </span>
                          )}
                        </div>
                        
                        {/* Service */}
                        {booking.service_name && (
                          <p className={`text-xs font-medium truncate ${styles.text}`}>
                            {booking.service_name}
                          </p>
                        )}
                        
                        {/* Client (only if enough space) */}
                        {height > 60 && (
                          <div className="mt-auto pt-1">
                            <p className={`text-sm font-semibold truncate ${styles.text}`}>
                              {booking.client_name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {booking.client_phone}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>
        </div>
      </div>

      {/* Bottom Navigation - Week Days */}
      <div className="mt-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-2 shadow-sm">
        <div className="flex items-center justify-between">
          {weekDays.map((day, idx) => {
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const isTodayDate = isToday(day);

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(day)}
                className={`flex-1 py-2 px-1 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-violet-600 text-white shadow-sm'
                    : isTodayDate
                    ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className={`text-xs font-medium ${
                  isSelected ? 'text-violet-200' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {dayNames[idx]}
                </span>
                <p className={`text-lg font-bold ${
                  isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          masters={masters}
          services={services}
          onClose={() => setSelectedBooking(null)}
          onUpdate={onReload}
        />
      )}
    </div>
  );
}

// ===================== BOOKING DETAIL MODAL =====================

function BookingDetailModal({ booking, masters, services, onClose, onUpdate }: {
  booking: BookingData;
  masters: MasterData[];
  services: ServiceData[];
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [status, setStatus] = useState(booking.status);
  const [saving, setSaving] = useState(false);

  const master = masters.find(m => m.id === booking.master_id);
  const service = services.find(s => s.id === booking.service_id);

  const handleStatusChange = async (newStatus: string) => {
    setSaving(true);
    await fetch('/api/booking', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: booking.id, status: newStatus }),
    });
    setStatus(newStatus);
    setSaving(false);
    onUpdate();
  };

  const handleCall = () => {
    window.location.href = `tel:${booking.client_phone}`;
  };

  const getStatusLabel = (s: string) => {
    const labels: Record<string, string> = {
      pending: 'Нова',
      confirmed: 'Підтверджено',
      completed: 'Завершено',
      cancelled: 'Скасовано',
    };
    return labels[s] || s;
  };

  const getStatusColor = (s: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[s] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white w-full lg:max-w-md lg:rounded-2xl rounded-t-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Деталі запису</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Client Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{booking.client_name}</h3>
                <p className="text-gray-500 mt-1">{booking.client_phone}</p>
                {booking.client_email && (
                  <p className="text-gray-500 text-sm">{booking.client_email}</p>
                )}
              </div>
              <button
                onClick={handleCall}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors"
              >
                <PhoneCall className="w-5 h-5" />
                Зателефонувати
              </button>
            </div>
          </div>

          {/* Booking Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Дата</span>
              <span className="font-medium text-gray-900">{new Date(booking.date).toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Час</span>
              <span className="font-medium text-gray-900">{booking.time} - {booking.time_end || ''}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Тривалість</span>
              <span className="font-medium text-gray-900">{booking.duration || 30} хв</span>
            </div>
            {service && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Послуга</span>
                <span className="font-medium text-gray-900">{service.name}</span>
              </div>
            )}
            {master && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Майстер</span>
                <div className="flex items-center gap-2">
                  {master.photo_url && (
                    <img src={master.photo_url} alt={master.name} className="w-6 h-6 rounded-full object-cover" />
                  )}
                  <span className="font-medium text-gray-900">{master.name}</span>
                </div>
              </div>
            )}
            {booking.price && (
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Вартість</span>
                <span className="font-bold text-gray-900">{booking.price} грн</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Статус</p>
            <div className="flex flex-wrap gap-2">
              {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status === s
                      ? getStatusColor(s) + ' ring-2 ring-offset-2 ring-gray-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getStatusLabel(s)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Закрити
          </Button>
          <Button
            onClick={handleCall}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl"
          >
            <PhoneCall className="w-4 h-4 mr-2" />
            Зателефонувати
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===================== SETTINGS TAB =====================

function SettingsTab({ salon, onUpdate }: { salon: SalonData; onUpdate: (updates: Partial<SalonData>) => void }) {
  const [activeSection, setActiveSection] = useState('profile');

  const sections = [
    { id: 'profile', label: 'Профіль', icon: Store },
    { id: 'schedule', label: 'Графік роботи', icon: Clock },
    { id: 'photos', label: 'Фото', icon: Image },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Sidebar */}
      <div className="lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-xl border border-gray-200 p-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                activeSection === section.id
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span className="font-medium">{section.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {activeSection === 'profile' && (
          <ProfileTab salon={salon} onUpdate={onUpdate} />
        )}
        {activeSection === 'schedule' && (
          <ScheduleTab salon={salon} onUpdate={onUpdate} />
        )}
        {activeSection === 'photos' && (
          <PhotosTab salon={salon} onUpdate={onUpdate} />
        )}
      </div>
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs lg:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 lg:w-12 lg:h-12 ${colors[color].bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${colors[color].icon}`} />
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
    confirmed: 'Подтв.',
    pending: 'Ожидает',
    completed: 'Готово',
    cancelled: 'Отменено',
  };

  return (
    <div className="p-3 lg:p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-3 lg:gap-4">
        <div className="w-10 h-10 lg:w-12 lg:h-12 bg-violet-100 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-xs text-violet-600 font-medium">
            {new Date(booking.date).toLocaleDateString('ru-RU', { day: 'numeric' })}
          </span>
          <span className="text-[10px] text-violet-500 uppercase">
            {new Date(booking.date).toLocaleDateString('ru-RU', { month: 'short' })}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 truncate">{booking.client_name}</p>
          <p className="text-sm text-gray-500 truncate">
            {booking.time} • {booking.service_name || 'Услуга'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-medium ${statusStyles[booking.status] || 'bg-gray-100 text-gray-700'}`}>
            {statusLabels[booking.status] || booking.status}
          </span>
          {showActions && (
            <button className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <MoreHorizontal className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <span className="text-gray-600 truncate">{value}</span>
    </div>
  );
}
