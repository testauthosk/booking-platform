'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, ChevronRight, Loader2, Check, X, Trash2, Menu, CalendarDays } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useSidebar } from '@/components/sidebar-context';

interface Master {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  workingHours?: Record<string, { enabled: boolean; start: string; end: string }>;
}

interface ScheduleOverride {
  id: string;
  date: string;
  isWorking: boolean;
  start: string | null;
  end: string | null;
  reason: string | null;
}

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];
const MONTHS_UA = [
  'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
  'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень',
];

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

const REASON_OPTIONS = ['Вихідний', 'Відпустка', 'Лікарняний', 'Змінений графік', 'Інше'];

export default function AdminTeamSchedule() {
  const { data: session } = useSession();
  const router = useRouter();
  const { open: openSidebar } = useSidebar();

  const salonId = session?.user?.salonId || '';

  const [loading, setLoading] = useState(true);
  const [masters, setMasters] = useState<Master[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modal
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIsWorking, setModalIsWorking] = useState(true);
  const [modalStart, setModalStart] = useState('09:00');
  const [modalEnd, setModalEnd] = useState('18:00');
  const [modalReason, setModalReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Time picker
  const [timePickerOpen, setTimePickerOpen] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    if (salonId) loadMasters();
  }, [salonId]);

  useEffect(() => {
    if (selectedMasterId) loadOverrides();
  }, [selectedMasterId, currentMonth]);

  const loadMasters = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/masters?salonId=${salonId}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(data);
        if (data.length > 0 && !selectedMasterId) {
          setSelectedMasterId(data[0].id);
          // Load full master data with workingHours
          loadMasterDetails(data[0].id);
        }
      }
    } catch (error) {
      console.error('Load masters error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMasterDetails = async (masterId: string) => {
    try {
      const res = await fetch(`/api/masters/${masterId}`);
      if (res.ok) {
        const data = await res.json();
        setMasters(prev => prev.map(m => m.id === masterId ? { ...m, workingHours: data.workingHours } : m));
      }
    } catch (error) {
      console.error('Load master details error:', error);
    }
  };

  const loadOverrides = async () => {
    if (!selectedMasterId) return;
    try {
      const monthStr = `${currentMonth.year}-${(currentMonth.month + 1).toString().padStart(2, '0')}`;
      const res = await fetch(`/api/masters/${selectedMasterId}/schedule-overrides?month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setOverrides(data);
      }
    } catch (error) {
      console.error('Load overrides error:', error);
    }
  };

  const selectMaster = (masterId: string) => {
    setSelectedMasterId(masterId);
    const master = masters.find(m => m.id === masterId);
    if (master && !master.workingHours) {
      loadMasterDetails(masterId);
    }
  };

  const selectedMaster = masters.find(m => m.id === selectedMasterId);
  const workingHours = selectedMaster?.workingHours || {};

  const getMonthDays = useCallback(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = month === 0 ? 12 : month;
      const y = month === 0 ? year - 1 : year;
      days.push({
        date: `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month + 2 > 12 ? 1 : month + 2;
      const y = month + 2 > 12 ? year + 1 : year;
      days.push({
        date: `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
        day: d,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentMonth]);

  const getDayInfo = (dateStr: string) => {
    const override = overrides.find(o => o.date === dateStr);
    if (override) {
      return {
        type: override.isWorking ? 'override-working' as const : 'override-dayoff' as const,
        override,
        start: override.start,
        end: override.end,
        reason: override.reason,
      };
    }

    const date = new Date(dateStr + 'T12:00:00');
    const dow = date.getDay();
    const dayKey = DAY_KEYS[dow];
    const template = workingHours[dayKey];

    if (!template || !template.enabled) {
      return { type: 'template-dayoff' as const, start: null, end: null, override: null, reason: null };
    }

    return {
      type: 'template-working' as const,
      start: template.start,
      end: template.end,
      override: null,
      reason: null,
    };
  };

  // Stats calculation
  const getMonthStats = useCallback(() => {
    const { year, month } = currentMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    let dayOff = 0;
    let templateDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      const info = getDayInfo(dateStr);
      switch (info.type) {
        case 'override-working':
          workingDays++;
          break;
        case 'override-dayoff':
          dayOff++;
          break;
        case 'template-working':
          workingDays++;
          templateDays++;
          break;
        case 'template-dayoff':
          dayOff++;
          templateDays++;
          break;
      }
    }

    return { workingDays, dayOff, templateDays };
  }, [currentMonth, overrides, workingHours]);

  const openDayModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    const info = getDayInfo(dateStr);

    if (info.override) {
      setModalIsWorking(info.override.isWorking);
      setModalStart(info.override.start || '09:00');
      setModalEnd(info.override.end || '18:00');
      setModalReason(info.override.reason || '');
    } else {
      const date = new Date(dateStr + 'T12:00:00');
      const dow = date.getDay();
      const dayKey = DAY_KEYS[dow];
      const template = workingHours[dayKey];

      if (template && template.enabled) {
        setModalIsWorking(true);
        setModalStart(template.start || '09:00');
        setModalEnd(template.end || '18:00');
      } else {
        setModalIsWorking(false);
        setModalStart('09:00');
        setModalEnd('18:00');
      }
      setModalReason('');
    }

    setModalOpen(true);
  };

  const saveOverride = async () => {
    if (!selectedDate || !selectedMasterId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/masters/${selectedMasterId}/schedule-overrides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          isWorking: modalIsWorking,
          start: modalIsWorking ? modalStart : null,
          end: modalIsWorking ? modalEnd : null,
          reason: modalReason || null,
        }),
      });

      if (res.ok) {
        await loadOverrides();
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка збереження');
      }
    } catch (error) {
      console.error('Save override error:', error);
      alert('Помилка зʼєднання');
    } finally {
      setSaving(false);
    }
  };

  const deleteOverride = async () => {
    if (!selectedDate || !selectedMasterId) return;
    const override = overrides.find(o => o.date === selectedDate);
    if (!override) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/masters/${selectedMasterId}/schedule-overrides?id=${override.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadOverrides();
        setModalOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Помилка видалення');
      }
    } catch (error) {
      console.error('Delete override error:', error);
    } finally {
      setDeleting(false);
    }
  };

  const prevMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { ...prev, month: prev.month - 1 };
    });
  };

  const nextMonth = () => {
    setCurrentMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { ...prev, month: prev.month + 1 };
    });
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    return dateStr === todayStr;
  };

  const formatSelectedDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const dayNames = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', 'Пʼятниця', 'Субота'];
    const monthNames = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
    return `${dayNames[date.getDay()]}, ${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

  const setTimePicker = (field: 'start' | 'end', value: string) => {
    if (field === 'start') {
      setModalStart(value);
      if (value >= modalEnd) {
        const idx = TIME_OPTIONS.indexOf(value);
        const newEnd = TIME_OPTIONS[Math.min(idx + 2, TIME_OPTIONS.length - 1)];
        setModalEnd(newEnd);
      }
    } else {
      setModalEnd(value);
    }
    setTimePickerOpen(null);
  };

  const getTimeOptionsForField = (field: 'start' | 'end') => {
    if (field === 'start') return TIME_OPTIONS;
    const startIdx = TIME_OPTIONS.indexOf(modalStart);
    return TIME_OPTIONS.slice(startIdx + 1);
  };

  const getAvatarColor = (index: number) => {
    const colors = ['bg-orange-500', 'bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500'];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const days = getMonthDays();
  const stats = getMonthStats();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile header */}
      <header
        className="lg:hidden bg-white border-b border-gray-200 shrink-0 z-20 sticky top-0"
        style={{ height: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <button
          onClick={openSidebar}
          className="shrink-0 active:scale-95 transition-transform p-2 rounded-xl border border-gray-200 hover:bg-gray-50"
          style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#ffffff', border: '1px solid rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Menu className="text-gray-700" style={{ width: 18, height: 18 }} />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold truncate">Графік команди</h1>
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <NotificationBell />
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 lg:p-6 pb-24">
        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Графік команди</h1>
            <p className="text-muted-foreground">Зміни до шаблону по дням</p>
          </div>
        </div>

        {/* Master selector - horizontal scroll chips */}
        <div className="overflow-x-auto -mx-4 px-4 mb-4 scrollbar-hide">
          <div className="flex gap-2 pb-1">
            {masters.map((master, index) => (
              <button
                key={master.id}
                onClick={() => selectMaster(master.id)}
                className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 ${
                  selectedMasterId === master.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border hover:bg-muted'
                }`}
              >
                {master.avatar ? (
                  <img src={master.avatar} alt={master.name} className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <div className={`h-7 w-7 rounded-lg ${
                    selectedMasterId === master.id ? 'bg-primary-foreground/20' : getAvatarColor(index)
                  } flex items-center justify-center text-xs font-bold ${
                    selectedMasterId === master.id ? '' : 'text-white'
                  }`}>
                    {master.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-medium whitespace-nowrap">{master.name}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedMasterId && (
          <>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="h-9 w-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <h2 className="font-semibold text-base">
                {MONTHS_UA[currentMonth.month]} {currentMonth.year}
              </h2>
              <button
                onClick={nextMonth}
                className="h-9 w-9 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Summary bar */}
            <Card className="p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-muted-foreground">{stats.workingDays} робочих</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">{stats.dayOff} вихідних</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />
                  <span className="text-muted-foreground">{stats.templateDays} за шаблоном</span>
                </div>
              </div>
            </Card>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAY_LABELS.map(label => (
                <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                const info = day.isCurrentMonth ? getDayInfo(day.date) : null;
                const today = isToday(day.date);

                let bgColor = '';
                let textColor = 'text-foreground';
                let borderStyle = '';
                let timeText = '';

                if (!day.isCurrentMonth) {
                  textColor = 'text-gray-300';
                } else if (info) {
                  switch (info.type) {
                    case 'override-dayoff':
                      bgColor = 'bg-red-50';
                      borderStyle = 'border border-red-200';
                      textColor = 'text-red-600';
                      break;
                    case 'override-working':
                      bgColor = 'bg-orange-50';
                      borderStyle = 'border border-orange-200';
                      timeText = info.start && info.end ? `${info.start}-${info.end}` : '';
                      break;
                    case 'template-dayoff':
                      textColor = 'text-gray-400';
                      break;
                    case 'template-working':
                      bgColor = 'bg-green-50';
                      timeText = info.start && info.end ? `${info.start}-${info.end}` : '';
                      break;
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => day.isCurrentMonth && openDayModal(day.date)}
                    disabled={!day.isCurrentMonth}
                    className={`relative aspect-square rounded-xl flex flex-col items-center justify-center p-0.5 transition-all duration-200 ${bgColor} ${borderStyle} ${
                      day.isCurrentMonth ? 'hover:bg-muted active:scale-95 cursor-pointer' : ''
                    } ${today ? 'ring-2 ring-primary ring-offset-1 ring-offset-background' : ''}`}
                  >
                    <span className={`text-sm font-medium ${textColor} ${
                      info?.type === 'override-dayoff' ? 'line-through' : ''
                    }`}>
                      {day.day}
                    </span>
                    {day.isCurrentMonth && timeText && (
                      <span className={`text-[7px] leading-tight ${
                        info?.type === 'override-working' ? 'text-orange-600' : 'text-gray-400'
                      }`}>
                        {timeText}
                      </span>
                    )}
                    {info?.type === 'override-dayoff' && (
                      <span className="text-[7px] text-red-500 leading-tight">вих</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-green-50 border border-green-200" />
                <span>За шаблоном</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-orange-50 border border-orange-200" />
                <span>Змінено</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded bg-red-50 border border-red-200" />
                <span>Вихідний</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded ring-2 ring-gray-900 ring-offset-1 ring-offset-white" />
                <span>Сьогодні</span>
              </div>
            </div>
          </>
        )}

        {masters.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Додайте майстрів для налаштування графіку</p>
          </div>
        )}
      </div>

      {/* Day Modal - Dialog style for admin */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-300 ${
          modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setModalOpen(false)}
      />
      <div
        className={`fixed inset-x-0 bottom-0 lg:inset-auto lg:top-1/2 lg:left-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-[440px] lg:rounded-2xl bg-card rounded-t-3xl shadow-xl z-50 transform transition-all duration-300 ease-out ${
          modalOpen ? 'translate-y-0 lg:scale-100 lg:opacity-100' : 'translate-y-full lg:scale-95 lg:opacity-0'
        }`}
      >
        {selectedDate && selectedMaster && (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">{formatSelectedDate(selectedDate)}</h3>
                <p className="text-sm text-muted-foreground">{selectedMaster.name}</p>
                {getDayInfo(selectedDate).override && (
                  <p className="text-xs text-orange-600">Має зміни до шаблону</p>
                )}
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Робочий день</p>
                  <p className="text-sm text-muted-foreground">
                    {modalIsWorking ? 'Працює цього дня' : 'Вихідний'}
                  </p>
                </div>
                <Switch
                  checked={modalIsWorking}
                  onCheckedChange={setModalIsWorking}
                />
              </div>

              {modalIsWorking && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Початок</label>
                    <button
                      onClick={() => setTimePickerOpen('start')}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-left flex items-center justify-between hover:bg-muted transition-colors"
                    >
                      <span>{modalStart}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Кінець</label>
                    <button
                      onClick={() => setTimePickerOpen('end')}
                      className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-left flex items-center justify-between hover:bg-muted transition-colors"
                    >
                      <span>{modalEnd}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90" />
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Причина (необовʼязково)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {REASON_OPTIONS.map(reason => (
                    <button
                      key={reason}
                      onClick={() => setModalReason(modalReason === reason ? '' : reason)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        modalReason === reason
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={modalReason}
                  onChange={e => setModalReason(e.target.value)}
                  placeholder="Або введіть свою причину..."
                  className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="p-4 border-t border-border space-y-2">
              <button
                onClick={saveOverride}
                disabled={saving}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Зберегти
                  </>
                )}
              </button>

              {getDayInfo(selectedDate).override && (
                <button
                  onClick={deleteOverride}
                  disabled={deleting}
                  className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Повернути за шаблоном
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Time Picker Bottom Sheet */}
      {timePickerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60]"
          onClick={() => setTimePickerOpen(null)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[70] transform transition-transform duration-300 ${
          timePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timePickerOpen && getTimeOptionsForField(timePickerOpen).map(time => {
            const current = timePickerOpen === 'start' ? modalStart : modalEnd;
            return (
              <button
                key={time}
                onClick={() => setTimePicker(timePickerOpen, time)}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                  current === time ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {current === time && <Check className="h-5 w-5" />}
                <span className={current === time ? '' : 'ml-8'}>{time}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setTimePickerOpen(null)}
          className="w-full py-4 text-center text-zinc-400 border-t border-zinc-700"
        >
          <X className="h-5 w-5 mx-auto" />
        </button>
      </div>
    </div>
  );
}
