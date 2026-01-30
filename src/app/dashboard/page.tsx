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
              workingHours={salon.working_hours || []}
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

function BookingsTab({ bookings, salonId, services, masters, workingHours, onReload }: {
  bookings: BookingData[];
  salonId: string;
  services: ServiceData[];
  masters: MasterData[];
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
          className="status-select"
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
          bookings={bookings}
          workingHours={workingHours}
          onClose={() => setShowModal(false)}
          onSave={onReload}
        />
      )}
    </div>
  );
}

// Модалка создания записи с календарём
function QuickBookingModal({ salonId, services, masters, bookings, workingHours, onClose, onSave }: {
  salonId: string;
  services: ServiceData[];
  masters: MasterData[];
  bookings: BookingData[];
  workingHours: WorkingHour[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'calendar' | 'time' | 'details'>('calendar');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedService, setSelectedService] = useState<ServiceData | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<MasterData | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  // Текущий месяц для календаря
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Генерация дней календаря
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Понедельник = 0

    const days: (Date | null)[] = [];

    // Пустые ячейки до первого дня
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Дни месяца
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  // Проверка рабочий ли день
  const isWorkingDay = (date: Date) => {
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const dayName = dayNames[date.getDay()];
    const wh = workingHours.find(h => h.day === dayName);
    return wh?.is_working ?? false;
  };

  // Проверка прошедшая ли дата
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Генерация свободных слотов на выбранную дату
  const generateTimeSlots = () => {
    if (!selectedDate) return [];

    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const date = new Date(selectedDate);
    const dayName = dayNames[date.getDay()];
    const wh = workingHours.find(h => h.day === dayName);

    if (!wh?.is_working) return [];

    const [openH, openM] = wh.open.split(':').map(Number);
    const [closeH, closeM] = wh.close.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    // Получаем занятые слоты на этот день
    const dayBookings = bookings.filter(b => b.date === selectedDate);

    const slots: { time: string; available: boolean }[] = [];
    const step = 30; // Шаг 30 минут

    for (let mins = openMins; mins < closeMins; mins += step) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      // Проверяем занятость
      const isBooked = dayBookings.some(b => {
        const [bh, bm] = b.time.split(':').map(Number);
        const bookingStart = bh * 60 + bm;
        const duration = selectedService?.duration || 60;
        const bookingEnd = bookingStart + duration;
        const slotEnd = mins + (selectedService?.duration || 30);

        // Проверка пересечения
        return (mins < bookingEnd && slotEnd > bookingStart);
      });

      // Проверка что слот + длительность услуги не выходит за рамки
      const slotEnd = mins + (selectedService?.duration || 30);
      const fitsInSchedule = slotEnd <= closeMins;

      slots.push({ time: timeStr, available: !isBooked && fitsInSchedule });
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const calendarDays = generateCalendarDays();

  const handleDateClick = (date: Date) => {
    if (isPastDate(date) || !isWorkingDay(date)) return;
    setSelectedDate(date.toISOString().split('T')[0]);
    setSelectedTime('');
    setStep('time');
  };

  const handleTimeClick = (time: string) => {
    setSelectedTime(time);
    setStep('details');
  };

  const handleSubmit = async () => {
    if (!clientName || !clientPhone || !selectedDate || !selectedTime) return;

    setSaving(true);

    // Расчёт времени окончания
    const [h, m] = selectedTime.split(':').map(Number);
    const endMins = h * 60 + m + (selectedService?.duration || 60);
    const endH = Math.floor(endMins / 60);
    const endM = endMins % 60;
    const timeEnd = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    await supabase.from('bookings').insert({
      salon_id: salonId,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: '',
      date: selectedDate,
      time: selectedTime,
      time_end: timeEnd,
      duration: selectedService?.duration || 60,
      service_id: selectedService?.id || null,
      service_name: selectedService?.name || '',
      master_id: selectedMaster?.id || null,
      master_name: selectedMaster?.name || '',
      price: selectedService?.price || 0,
      status: 'confirmed',
    });

    setSaving(false);
    onSave();
    onClose();
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            {step !== 'calendar' && (
              <button
                onClick={() => setStep(step === 'details' ? 'time' : 'calendar')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Новая запись</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 'calendar' && 'Выберите дату'}
                {step === 'time' && `Выберите время на ${new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`}
                {step === 'details' && 'Данные клиента'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Шаг 1: Выбор услуги (всегда видно сверху) */}
          {step === 'calendar' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Выберите услугу</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {services.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedService(s)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedService?.id === s.id
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.duration} мин • {s.price} ₴</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Шаг 1: Календарь */}
          {step === 'calendar' && (
            <div>
              {/* Навигация по месяцам */}
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
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Календарь */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, i) => {
                  if (!date) {
                    return <div key={i} className="aspect-square" />;
                  }

                  const isToday = date.toDateString() === new Date().toDateString();
                  const isPast = isPastDate(date);
                  const isWorking = isWorkingDay(date);
                  const isSelected = date.toISOString().split('T')[0] === selectedDate;
                  const isDisabled = isPast || !isWorking;

                  return (
                    <button
                      key={i}
                      onClick={() => handleDateClick(date)}
                      disabled={isDisabled}
                      className={`aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white'
                          : isToday
                          ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                          : isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Легенда */}
              <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-violet-100"></span>
                  Сегодня
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-gray-100"></span>
                  Выходной
                </span>
              </div>
            </div>
          )}

          {/* Шаг 2: Выбор времени */}
          {step === 'time' && (
            <div>
              {/* Выбранная услуга */}
              {selectedService && (
                <div className="mb-4 p-3 bg-violet-50 rounded-xl">
                  <p className="text-sm font-medium text-violet-900">{selectedService.name}</p>
                  <p className="text-xs text-violet-600">{selectedService.duration} мин • {selectedService.price} ₴</p>
                </div>
              )}

              {/* Выбор мастера */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Мастер</label>
                <select
                  value={selectedMaster?.id || ''}
                  onChange={(e) => setSelectedMaster(masters.find(m => m.id === e.target.value) || null)}
                  className="form-select text-sm"
                >
                  <option value="">Любой свободный</option>
                  {masters.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {/* Временные слоты */}
              <label className="block text-sm font-medium text-gray-700 mb-2">Свободное время</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {timeSlots.map(slot => (
                  <button
                    key={slot.time}
                    onClick={() => slot.available && handleTimeClick(slot.time)}
                    disabled={!slot.available}
                    className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === slot.time
                        ? 'bg-violet-600 text-white'
                        : slot.available
                        ? 'bg-gray-100 text-gray-700 hover:bg-violet-100 hover:text-violet-700'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>

              {timeSlots.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p>Нет доступного времени на этот день</p>
                </div>
              )}
            </div>
          )}

          {/* Шаг 3: Данные клиента */}
          {step === 'details' && (
            <div className="space-y-5">
              {/* Сводка */}
              <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Дата</span>
                  <span className="font-medium text-gray-900">
                    {new Date(selectedDate).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Время</span>
                  <span className="font-medium text-gray-900">{selectedTime}</span>
                </div>
                {selectedService && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Услуга</span>
                    <span className="font-medium text-gray-900">{selectedService.name} • {selectedService.price} ₴</span>
                  </div>
                )}
                {selectedMaster && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Мастер</span>
                    <span className="font-medium text-gray-900">{selectedMaster.name}</span>
                  </div>
                )}
              </div>

              {/* Форма клиента */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя клиента *</label>
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
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="form-input"
                    placeholder="+380 XX XXX XX XX"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'details' && (
          <div className="p-5 border-t border-gray-100 flex-shrink-0">
            <Button
              onClick={handleSubmit}
              disabled={saving || !clientName || !clientPhone}
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
          </div>
        )}
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
  const [saved, setSaved] = useState(false);
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
    setSaved(false);
  };

  // Проверка валидности времени для каждого дня
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
    const { error } = await supabase
      .from('salons')
      .update({ working_hours: schedule, updated_at: new Date().toISOString() })
      .eq('id', salon.id);

    if (!error) {
      onUpdate({ working_hours: schedule });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  // Быстрые пресеты
  const applyPreset = (type: 'weekdays' | 'everyday' | 'custom') => {
    let newSchedule: WorkingHour[];

    if (type === 'weekdays') {
      newSchedule = schedule.map((day, i) => ({
        ...day,
        is_working: i < 5, // Пн-Пт
        open: '09:00',
        close: '18:00',
      }));
    } else if (type === 'everyday') {
      newSchedule = schedule.map(day => ({
        ...day,
        is_working: true,
        open: '10:00',
        close: '22:00',
      }));
    } else {
      return;
    }

    setSchedule(newSchedule);
    setSaved(false);
  };

  return (
    <div className="max-w-2xl space-y-4">
      {/* Быстрые пресеты */}
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

      {/* Основное расписание */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
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
                {/* День недели */}
                <div className="w-28 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-700">{day.day}</span>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => updateDay(i, { is_working: !day.is_working })}
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                    day.is_working ? 'bg-violet-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                      day.is_working ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>

                {/* Время или Выходной */}
                {day.is_working ? (
                  <div className="flex items-center gap-2 flex-1">
                    <select
                      value={day.open}
                      onChange={(e) => updateDay(i, { open: e.target.value })}
                      className="time-select"
                    >
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <span className="text-gray-400 font-medium">—</span>
                    <select
                      value={day.close}
                      onChange={(e) => updateDay(i, { close: e.target.value })}
                      className={`time-select ${isInvalid ? 'border-red-400 bg-red-50' : ''}`}
                    >
                      {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>

                    {isInvalid && (
                      <span className="text-xs text-red-600 ml-2">Неверное время</span>
                    )}
                  </div>
                ) : (
                  <div className="flex-1">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                      Выходной
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Ошибка валидации */}
        {hasErrors && (
          <div className="mt-4 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Невозможно сохранить расписание</p>
              <p className="text-sm text-red-600 mt-1">
                Время закрытия должно быть позже времени открытия: {invalidDays.map(d => d.day).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Кнопка сохранения */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || hasErrors}
            className={`rounded-xl px-6 transition-all ${
              hasErrors
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-violet-600 hover:bg-violet-700 text-white'
            }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить расписание
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
