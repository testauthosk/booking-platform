'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { staffFetch } from '@/lib/staff-fetch';
import { Switch } from '@/components/ui/switch';
import { ChevronLeft, Loader2, Check, X, Copy } from 'lucide-react';

interface DaySchedule {
  enabled: boolean;
  start: string;
  end: string;
}

interface WorkingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

const DAYS = [
  { key: 'monday', label: 'Понеділок', short: 'Пн' },
  { key: 'tuesday', label: 'Вівторок', short: 'Вт' },
  { key: 'wednesday', label: 'Середа', short: 'Ср' },
  { key: 'thursday', label: 'Четвер', short: 'Чт' },
  { key: 'friday', label: 'Пʼятниця', short: 'Пт' },
  { key: 'saturday', label: 'Субота', short: 'Сб' },
  { key: 'sunday', label: 'Неділя', short: 'Нд' },
];

const TIME_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const hour = 7 + Math.floor(i / 2);
  const min = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${min}`;
});

const defaultSchedule: WorkingHours = {
  monday: { enabled: true, start: '09:00', end: '18:00' },
  tuesday: { enabled: true, start: '09:00', end: '18:00' },
  wednesday: { enabled: true, start: '09:00', end: '18:00' },
  thursday: { enabled: true, start: '09:00', end: '18:00' },
  friday: { enabled: true, start: '09:00', end: '18:00' },
  saturday: { enabled: true, start: '10:00', end: '16:00' },
  sunday: { enabled: false, start: '10:00', end: '16:00' },
};

export default function StaffSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [schedule, setSchedule] = useState<WorkingHours>(defaultSchedule);
  const [timePickerOpen, setTimePickerOpen] = useState<{ day: string; field: 'start' | 'end' } | null>(null);

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
      loadSchedule();
    }
  }, [staffId]);

  const loadSchedule = async () => {
    try {
      const res = await staffFetch(`/api/staff/profile?masterId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.workingHours) {
          setSchedule({ ...defaultSchedule, ...data.workingHours });
        }
      }
    } catch (error) {
      console.error('Load schedule error:', error);
    }
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      const res = await staffFetch('/api/staff/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId: staffId,
          workingHours: schedule
        })
      });
      
      if (res.ok) {
        router.push('/staff');
      }
    } catch (error) {
      console.error('Save schedule error:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayKey: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey as keyof WorkingHours],
        enabled: !prev[dayKey as keyof WorkingHours].enabled
      }
    }));
  };

  const setTime = (dayKey: string, field: 'start' | 'end', value: string) => {
    setSchedule(prev => {
      const daySchedule = prev[dayKey as keyof WorkingHours];
      const newSchedule = { ...daySchedule, [field]: value };
      
      // Если начало >= конца, сдвигаем конец на +1 час
      if (field === 'start' && value >= daySchedule.end) {
        const startIndex = TIME_OPTIONS.indexOf(value);
        const newEndIndex = Math.min(startIndex + 2, TIME_OPTIONS.length - 1); // +1 час
        newSchedule.end = TIME_OPTIONS[newEndIndex];
      }
      
      return { ...prev, [dayKey]: newSchedule };
    });
    setTimePickerOpen(null);
  };

  const applyMondayToAll = () => {
    const monday = schedule.monday;
    setSchedule(prev => ({
      ...prev,
      tuesday: { ...prev.tuesday, start: monday.start, end: monday.end },
      wednesday: { ...prev.wednesday, start: monday.start, end: monday.end },
      thursday: { ...prev.thursday, start: monday.start, end: monday.end },
      friday: { ...prev.friday, start: monday.start, end: monday.end },
      saturday: { ...prev.saturday, start: monday.start, end: monday.end },
      sunday: { ...prev.sunday, start: monday.start, end: monday.end },
    }));
  };

  const getTimeOptionsForField = (dayKey: string, field: 'start' | 'end') => {
    if (field === 'start') return TIME_OPTIONS;
    // Для конца — только время >= начала
    const daySchedule = schedule[dayKey as keyof WorkingHours];
    const startIndex = TIME_OPTIONS.indexOf(daySchedule.start);
    return TIME_OPTIONS.slice(startIndex + 1); // +1 чтобы конец был хотя бы на 30 мин позже
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 shrink-0 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/staff')}
              className="h-9 w-10 rounded-xl border border-border hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Графік роботи</h1>
              <p className="text-sm text-muted-foreground">Налаштуйте робочі години</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-3">
        {/* Apply to all button */}
        <button
          onClick={applyMondayToAll}
          className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Застосувати Пн до всіх
        </button>

        {DAYS.map(day => {
          const daySchedule = schedule[day.key as keyof WorkingHours];
          return (
            <Card key={day.key} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={daySchedule.enabled}
                    onCheckedChange={() => toggleDay(day.key)}
                  />
                  <span className={`font-medium ${!daySchedule.enabled ? 'text-muted-foreground' : ''}`}>{day.label}</span>
                </div>
                
                <div className={`flex items-center gap-2 ${!daySchedule.enabled ? 'opacity-40' : ''}`}>
                  <button
                    onClick={() => daySchedule.enabled && setTimePickerOpen({ day: day.key, field: 'start' })}
                    className={`px-3 py-1.5 rounded-lg bg-muted text-sm font-medium ${!daySchedule.enabled ? 'cursor-default' : ''}`}
                  >
                    {daySchedule.start}
                  </button>
                  <span className="text-muted-foreground">—</span>
                  <button
                    onClick={() => daySchedule.enabled && setTimePickerOpen({ day: day.key, field: 'end' })}
                    className={`px-3 py-1.5 rounded-lg bg-muted text-sm font-medium ${!daySchedule.enabled ? 'cursor-default' : ''}`}
                  >
                    {daySchedule.end}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      <div className="shrink-0 p-4 bg-card border-t">
        <button
          onClick={saveSchedule}
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
      </div>

      {/* Time Picker */}
      {timePickerOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-50"
          onClick={() => setTimePickerOpen(null)}
        />
      )}
      <div 
        className={`fixed inset-x-0 bottom-0 bg-zinc-800 rounded-t-2xl z-[60] transform transition-transform duration-300 ${
          timePickerOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="p-2 max-h-[50vh] overflow-y-auto">
          {timePickerOpen && getTimeOptionsForField(timePickerOpen.day, timePickerOpen.field).map((time) => {
            const currentValue = schedule[timePickerOpen.day as keyof WorkingHours][timePickerOpen.field];
            return (
              <button
                key={time}
                onClick={() => setTime(timePickerOpen.day, timePickerOpen.field, time)}
                className={`w-full py-3 px-4 rounded-xl text-left flex items-center gap-3 ${
                  currentValue === time ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {currentValue === time && <Check className="h-5 w-5" />}
                <span className={currentValue === time ? '' : 'ml-8'}>{time}</span>
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
