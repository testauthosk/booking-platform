'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { ChevronLeft, Loader2, Check, X } from 'lucide-react';

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
      const res = await fetch(`/api/staff/profile?masterId=${staffId}`);
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
      const res = await fetch('/api/staff/profile', {
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
    setSchedule(prev => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey as keyof WorkingHours],
        [field]: value
      }
    }));
    setTimePickerOpen(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/staff')}
              className="h-10 w-10 rounded-xl hover:bg-muted flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-semibold text-lg">Графік роботи</h1>
              <p className="text-sm text-muted-foreground">Налаштуйте робочі години</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-32 space-y-3">
        {DAYS.map(day => {
          const daySchedule = schedule[day.key as keyof WorkingHours];
          return (
            <Card key={day.key} className={`p-4 ${!daySchedule.enabled ? 'opacity-50' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(day.key)}
                    className={`h-6 w-11 rounded-full transition-colors relative ${
                      daySchedule.enabled ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      daySchedule.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="font-medium">{day.label}</span>
                </div>
                
                {daySchedule.enabled && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTimePickerOpen({ day: day.key, field: 'start' })}
                      className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium"
                    >
                      {daySchedule.start}
                    </button>
                    <span className="text-muted-foreground">—</span>
                    <button
                      onClick={() => setTimePickerOpen({ day: day.key, field: 'end' })}
                      className="px-3 py-1.5 rounded-lg bg-muted text-sm font-medium"
                    >
                      {daySchedule.end}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t">
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
          {TIME_OPTIONS.map((time) => {
            const currentValue = timePickerOpen 
              ? schedule[timePickerOpen.day as keyof WorkingHours][timePickerOpen.field]
              : '';
            return (
              <button
                key={time}
                onClick={() => timePickerOpen && setTime(timePickerOpen.day, timePickerOpen.field, time)}
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
