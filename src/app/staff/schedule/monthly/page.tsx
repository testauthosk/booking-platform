'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { staffFetch } from '@/lib/staff-fetch';
import { ChevronLeft, ChevronRight, Loader2, Check, X, Trash2 } from 'lucide-react';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  [key: string]: DaySchedule;
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

export default function StaffMonthlySchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [staffId, setStaffId] = useState('');
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  // Modal state
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
    const token = localStorage.getItem('staffToken');
    const id = localStorage.getItem('staffId');
    if (!token) {
      router.push('/staff/login');
      return;
    }
    setStaffId(id || '');
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (staffId) {
      loadProfile();
    }
  }, [staffId]);

  useEffect(() => {
    if (staffId) {
      loadOverrides();
    }
  }, [staffId, currentMonth]);

  const loadProfile = async () => {
    try {
      const res = await staffFetch(`/api/staff/profile?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.workingHours && typeof data.workingHours === 'object' && !Array.isArray(data.workingHours)) {
          setWorkingHours(data.workingHours);
        }
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  };

  const loadOverrides = async () => {
    try {
      const monthStr = `${currentMonth.year}-${(currentMonth.month + 1).toString().padStart(2, '0')}`;
      const res = await staffFetch(`/api/staff/schedule-overrides?masterId=${staffId}&month=${monthStr}`);
      if (res.ok) {
        const data = await res.json();
        setOverrides(data);
      }
    } catch (error) {
      console.error('Load overrides error:', error);
    }
  };

  const getMonthDays = useCallback(() => {
    const { year, month } = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday=0, so we shift: JS getDay() returns 0=Sun, we want Mon=0
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];

    // Previous month padding
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

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: `${year}-${(month + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    // Next month padding to fill grid
    const remaining = 42 - days.length; // 6 rows x 7
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

    // Get template for this day of week
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

  const openDayModal = (dateStr: string) => {
    setSelectedDate(dateStr);
    const info = getDayInfo(dateStr);

    if (info.override) {
      setModalIsWorking(info.override.isWorking);
      setModalStart(info.override.start || '09:00');
      setModalEnd(info.override.end || '18:00');
      setModalReason(info.override.reason || '');
    } else {
      // Pre-fill from template
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
    if (!selectedDate) return;
    setSaving(true);
    try {
      const res = await staffFetch('/api/staff/schedule-overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
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
    if (!selectedDate) return;
    const override = overrides.find(o => o.date === selectedDate);
    if (!override) return;

    setDeleting(true);
    try {
      const res = await staffFetch(`/api/staff/schedule-overrides?id=${override.id}`, {
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
      // Auto-adjust end if start >= end
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const days = getMonthDays();

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/staff/schedule')}
              className="h-9 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Місячний графік</h1>
              <p className="text-sm text-muted-foreground">Зміни до шаблону</p>
            </div>
          </div>
        </div>
      </header>

      {/* Month navigation */}
      <div className="px-4 py-3 flex items-center justify-between bg-card border-b">
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

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAY_LABELS.map(label => (
            <div key={label} className="text-center text-xs font-medium text-muted-foreground py-1">
              {label}
            </div>
          ))}
        </div>

        {/* Days grid */}
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
                  day.isCurrentMonth ? 'hover:bg-muted active:scale-95' : ''
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
      </div>

      {/* Day Modal - Bottom Sheet */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-all duration-300 ${
          modalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setModalOpen(false)}
      />
      <div
        className={`fixed inset-x-0 bottom-0 bg-card rounded-t-3xl shadow-xl z-50 transform transition-all duration-300 ease-out ${
          modalOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {selectedDate && (
          <>
            {/* Modal Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">{formatSelectedDate(selectedDate)}</h3>
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

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Working toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Робочий день</p>
                  <p className="text-sm text-muted-foreground">
                    {modalIsWorking ? 'Працюєте цього дня' : 'Вихідний'}
                  </p>
                </div>
                <Switch
                  checked={modalIsWorking}
                  onCheckedChange={setModalIsWorking}
                />
              </div>

              {/* Time pickers (only if working) */}
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

              {/* Reason */}
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

            {/* Modal Actions */}
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
